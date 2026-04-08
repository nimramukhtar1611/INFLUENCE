import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';
import { useSubscription } from '../context/SubscriptionContext';
import { 
  CpuChipIcon,
  ChartBarIcon, 
  CurrencyDollarIcon, 
  ShieldCheckIcon,
  UserGroupIcon,
  RocketLaunchIcon,
  CheckBadgeIcon,
  ArrowTrendingUpIcon,
  CameraIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  BuildingOfficeIcon,
  StarIcon,
  ChevronRightIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  BanknotesIcon,
  DocumentTextIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { 
  FaInstagram, 
  FaYoutube, 
  FaTiktok,
  FaTwitter,
  FaFacebook,
  FaLinkedin
} from 'react-icons/fa';
import toast from 'react-hot-toast';

const normalizePlanId = (value) => {
  if (value === null || value === undefined) return '';

  if (typeof value === 'string') {
    return value.trim().toLowerCase();
  }

  if (typeof value === 'object') {
    if (typeof value.planId === 'string') return value.planId.trim().toLowerCase();
    if (typeof value.id === 'string') return value.id.trim().toLowerCase();
    if (typeof value._id === 'string') return value._id.trim().toLowerCase();
  }

  return String(value).trim().toLowerCase();
};

const BRAND_PRICING_TIERS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$49',
    period: '/month',
    description: 'Perfect for small brands testing influencer marketing',
    features: [
      'Up to 3 active campaigns',
      'Search 1000+ creators',
      'Basic analytics',
      'Email support',
      'Standard contracts'
    ],
    cta: 'Start Free Trial',
    popular: false,
    gradient: 'from-gray-600 to-gray-800'
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$149',
    period: '/month',
    description: 'Ideal for growing brands with regular campaigns',
    features: [
      'Unlimited campaigns',
      'Advanced AI matching',
      'Real-time analytics',
      'Priority support',
      'Custom contracts',
      'API access'
    ],
    cta: 'Get Started',
    popular: true,
    gradient: 'from-[#667eea] to-[#764ba2]'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For agencies and large brands with custom needs',
    features: [
      'Unlimited everything',
      'Dedicated account manager',
      'Custom integrations',
      'SLA guarantee',
      'Bulk creator invites',
      'Advanced reporting'
    ],
    cta: 'Contact Sales',
    popular: false,
    gradient: 'from-purple-600 to-pink-600'
  }
];

const CREATOR_PRICING_TIERS = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for creators getting started',
    features: [
      'Completed deals cap: 2',
      'Basic discovery visibility',
      'Core deal collaboration tools',
      'Standard support'
    ],
    cta: 'Get Started',
    popular: false,
    gradient: 'from-gray-500 to-gray-700'
  },
  {
    id: 'starter',
    name: 'Starter',
    price: '$29',
    period: '/month',
    description: 'For creators building paid-collab momentum',
    features: [
      'Completed deals cap: 10',
      'Higher visibility for brand invites',
      'Expanded collaboration capacity',
      'Performance tracking insights'
    ],
    cta: 'Upgrade',
    popular: false,
    gradient: 'from-cyan-600 to-blue-700'
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$79',
    period: '/month',
    description: 'For creators focused on predictable growth',
    features: [
      'Completed deals cap: 30',
      'Creator Growth OS access',
      'Priority support',
      'Advanced performance intelligence'
    ],
    cta: 'Go Pro',
    popular: true,
    gradient: 'from-[#667eea] to-[#764ba2]'
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For top creators and teams running at scale',
    features: [
      'Completed deals cap: Infinite',
      'AI Counter Dealing access',
      'Enterprise workflow controls',
      'Dedicated success support'
    ],
    cta: 'Contact Sales',
    popular: false,
    gradient: 'from-purple-600 to-pink-600'
  }
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const { currentSubscription } = useSubscription();
  const [scrolled, setScrolled] = useState(false);
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const userType = String(user?.userType || user?.role || '').toLowerCase();
  const isBrandUser = isAuthenticated && userType === 'brand';
  const isCreatorUser = isAuthenticated && userType === 'creator';
  const isPricingUser = isBrandUser || isCreatorUser;

  const pricingTiers = useMemo(() => {
    if (isCreatorUser) return CREATOR_PRICING_TIERS;
    return BRAND_PRICING_TIERS;
  }, [isCreatorUser]);

  const currentPlanId = useMemo(() => {
    if (!isPricingUser || !currentSubscription) return '';

    const planIdCandidates = [
      currentSubscription.planDetails?.planId,
      currentSubscription.planDetails?.id,
      currentSubscription.planId?.planId,
      currentSubscription.planId,
      currentSubscription.planDetails?._id,
      currentSubscription.planId?._id,
      currentSubscription.plan
    ];

    for (const candidate of planIdCandidates) {
      const normalized = normalizePlanId(candidate);
      if (normalized) {
        return normalized;
      }
    }

    const currentPlanName = String(currentSubscription.planDetails?.name || '').trim().toLowerCase();
    if (!currentPlanName) return '';

    const matchedTier = pricingTiers.find((tier) => String(tier.name || '').trim().toLowerCase() === currentPlanName);
    return matchedTier?.id || '';
  }, [currentSubscription, isPricingUser, pricingTiers]);

  const currentPlanIndex = useMemo(() => {
    if (!currentPlanId) return -1;
    return pricingTiers.findIndex((tier) => normalizePlanId(tier.id) === normalizePlanId(currentPlanId));
  }, [currentPlanId, pricingTiers]);

  const subscriptionPath = isBrandUser
    ? '/brand/subscription'
    : isCreatorUser
      ? '/creator/subscription'
      : '/signup';

  const hasKnownCurrentPlan = currentPlanIndex >= 0;

  const getDashboardPath = () => {
    const userType = String(user?.userType || user?.role || '').toLowerCase();
    if (userType === 'brand') return '/brand/dashboard';
    if (userType === 'creator') return '/creator/dashboard';
    if (userType === 'admin' || userType === 'super_admin') return '/admin/dashboard';
    return '/';
  };

  const dashboardPath = getDashboardPath();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const stats = [
    { label: 'Active Creators', value: '10K+', icon: UserGroupIcon, suffix: 'creators' },
    { label: 'Brands', value: '2.5K+', icon: BuildingOfficeIcon, suffix: 'companies' },
    { label: 'Successful Deals', value: '15K+', icon: RocketLaunchIcon, suffix: 'campaigns' },
    { label: 'Payouts Processed', value: '$5M+', icon: CurrencyDollarIcon, suffix: 'paid' }
  ];

  const features = [
    {
      icon: CpuChipIcon,
      title: 'Smart Matching Algorithm',
      description: 'AI-powered matching finds the perfect micro-creators based on audience demographics, engagement patterns, and content style.',
      gradient: 'from-blue-600 to-[#667eea]',
      benefits: ['95% match accuracy', 'Real-time updates', 'Audience insights']
    },
    {
      icon: ChartBarIcon,
      title: 'Verified Analytics',
      description: 'Real-time verification of follower counts, engagement rates, and audience demographics. No fake followers, guaranteed.',
      gradient: 'from-purple-600 to-pink-600',
      benefits: ['Fake follower detection', 'Engryption rate analysis', 'Demographic insights']
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Secure Escrow Payments',
      description: 'Funds held in escrow until campaign completion. Automatic payouts with multiple withdrawal options worldwide.',
      gradient: 'from-green-600 to-teal-600',
      benefits: ['100% protection', 'Instant withdrawals', 'Multiple currencies']
    },
    {
      icon: ShieldCheckIcon,
      title: 'Smart Contracts',
      description: 'Automated digital contracts with e-signatures, deliverable tracking, and revision management built into the platform.',
      gradient: 'from-orange-600 to-red-600',
      benefits: ['Legal compliance', 'Automated revisions', 'Digital signatures']
    }
  ];

  const steps = [
    {
      number: '01',
      title: 'Create Account',
      description: 'Sign up as a brand or creator in under 2 minutes with email or social login',
      icon: UserGroupIcon,
      color: 'from-blue-600 to-[#667eea]'
    },
    {
      number: '02',
      title: 'Verify Identity',
      description: 'Verify your email, phone, and social media accounts to build trust',
      icon: CheckBadgeIcon,
      color: 'from-purple-600 to-pink-600'
    },
    {
      number: '03',
      title: 'Find Matches',
      description: 'AI-powered algorithm suggests perfect collaboration opportunities',
      icon: MagnifyingGlassIcon,
      color: 'from-green-600 to-teal-600'
    },
    {
      number: '04',
      title: 'Collaborate',
      description: 'Create campaigns, deliver content, and track performance in real-time',
      icon: RocketLaunchIcon,
      color: 'from-orange-600 to-red-600'
    },
    {
      number: '05',
      title: 'Get Paid',
      description: 'Secure escrow payments released automatically upon approval',
      icon: CurrencyDollarIcon,
      color: 'from-[#667eea] to-[#764ba2]'
    }
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Marketing Director',
      company: 'Glow Cosmetics',
      image: 'https://randomuser.me/api/portraits/women/44.jpg',
      content: 'InfluenceX transformed our influencer marketing strategy. We found authentic creators who actually resonate with our brand. ROI increased by 300% in just 3 months.',
      rating: 5
    },
    {
      name: 'Mike Chen',
      role: 'Fitness Creator',
      company: '10k followers',
      image: 'https://randomuser.me/api/portraits/men/32.jpg',
      content: 'As a micro-creator, InfluenceX helped me land my first brand deals. The platform is intuitive, payments are secure, and I love the analytics dashboard.',
      rating: 5
    },
    {
      name: 'Emily Rodriguez',
      role: 'Founder',
      company: 'Urban Threads',
      image: 'https://randomuser.me/api/portraits/women/63.jpg',
      content: 'The smart matching algorithm saved us countless hours. We found creators whose audience perfectly matches our target demographic. Highly recommended!',
      rating: 5
    }
  ];

  const platforms = [
    { icon: FaInstagram, name: 'Instagram', color: 'text-pink-600', bg: 'bg-pink-100 dark:bg-pink-900/30' },
    { icon: FaYoutube, name: 'YouTube', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-900/30' },
    { icon: FaTiktok, name: 'TikTok', color: 'text-black dark:text-white', bg: 'bg-gray-100 dark:bg-gray-800' },
    { icon: FaTwitter, name: 'Twitter', color: 'text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: FaFacebook, name: 'Facebook', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    { icon: FaLinkedin, name: 'LinkedIn', color: 'text-blue-700', bg: 'bg-blue-100 dark:bg-blue-900/30' }
  ];

  const getPricingAction = (tier, index) => {
    if (!isPricingUser) {
      return {
        label: tier.cta,
        to: '/signup',
        disabled: false
      };
    }

    if (!hasKnownCurrentPlan) {
      return {
        label: 'Subscribe',
        to: `${subscriptionPath}?plan=${tier.id}`,
        disabled: false
      };
    }

    const normalizedTierId = normalizePlanId(tier.id);
    if (normalizedTierId === normalizePlanId(currentPlanId)) {
      return {
        label: 'Manage Billing',
        to: subscriptionPath,
        disabled: false
      };
    }

    if (index < currentPlanIndex) {
      return {
        label: 'Current Plan Locked',
        to: '#',
        disabled: true
      };
    }

    return {
      label: 'Change Plan',
      to: `${subscriptionPath}?plan=${tier.id}`,
      disabled: false
    };
  };

  const faqs = [
    {
      question: 'How do you verify influencer metrics?',
      answer: 'We use real-time API connections to Instagram, YouTube, and TikTok to verify follower counts, engagement rates, and audience demographics. Our algorithm detects fake followers and engagement fraud.'
    },
    {
      question: 'How does the escrow payment system work?',
      answer: 'Brands fund the campaign amount into escrow. Funds are released to creators only after both parties approve the deliverables. This ensures secure transactions for both sides.'
    },
    {
      question: 'What fees does InfluenceX charge?',
      answer: 'We charge a 10% platform fee on successful campaigns. Premium subscriptions start at $49/month with additional features and lower transaction fees.'
    },
    {
      question: 'Can I cancel my subscription anytime?',
      answer: 'Yes, you can cancel your subscription at any time. No long-term contracts or hidden fees. Your campaigns will continue until completion.'
    }
  ];

  return (
    <div className="min-h-screen" style={{
      background: isDark 
        ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)'
        : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled 
          ? 'backdrop-blur-xl shadow-lg py-3' 
          : 'backdrop-blur-md py-5'
      }`}
      style={{
        background: scrolled 
          ? isDark 
            ? 'rgba(55, 65, 81, 0.95)'  // Light gray for dark mode
            : 'rgba(243, 244, 246, 0.95)' // Light gray for light mode
          : 'transparent',
        borderBottom: scrolled ? '1px solid rgba(0, 0, 0, 0.1)' : 'none'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3 group">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center transform group-hover:rotate-6 transition-all duration-300 backdrop-blur-md"
                style={{
                  background: scrolled 
                    ? isDark 
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(102, 126, 234, 0.1)'
                    : isDark 
                      ? 'rgba(255, 255, 255, 0.15)'
                      : 'rgba(255, 255, 255, 0.2)',
                  border: scrolled 
                    ? isDark 
                      ? '1px solid rgba(255, 255, 255, 0.2)'
                      : '1px solid rgba(102, 126, 234, 0.2)'
                    : '1px solid rgba(255, 255, 255, 0.2)'
                }}
              >
                <span className={`font-bold text-xl ${
                  scrolled 
                    ? isDark ? 'text-white' : 'text-[#667eea]'
                    : 'text-white'
                }`} style={{ textShadow: scrolled ? 'none' : '0 2px 4px rgba(0,0,0,0.3)' }}>IX</span>
              </div>
              <span className={`text-2xl font-bold ${
                scrolled 
                  ? isDark ? 'text-white' : 'text-gray-900'
                  : 'text-white'
              }`} style={{ textShadow: scrolled ? 'none' : '0 2px 4px rgba(0,0,0,0.3)' }}>
                InfluenceX
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className={`transition-colors font-medium ${
                scrolled 
                  ? isDark ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                  : 'text-white/90 hover:text-white'
              }`}>Features</a>
              <a href="#how-it-works" className={`transition-colors font-medium ${
                scrolled 
                  ? isDark ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                  : 'text-white/90 hover:text-white'
              }`}>How it Works</a>
              <a href="#pricing" className={`transition-colors font-medium ${
                scrolled 
                  ? isDark ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                  : 'text-white/90 hover:text-white'
              }`}>Pricing</a>
              <a href="#testimonials" className={`transition-colors font-medium ${
                scrolled 
                  ? isDark ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-gray-900'
                  : 'text-white/90 hover:text-white'
              }`}>Success Stories</a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link
                  to={dashboardPath}
                  className="px-6 py-3 rounded-xl font-medium hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2 backdrop-blur-md"
                  style={{
                    background: scrolled 
                      ? isDark 
                        ? 'rgba(255, 255, 255, 0.2)'
                        : 'rgba(102, 126, 234, 0.1)'
                      : 'rgba(255, 255, 255, 0.2)',
                    border: scrolled 
                      ? isDark 
                        ? '1px solid rgba(255, 255, 255, 0.3)'
                        : '1px solid rgba(102, 126, 234, 0.3)'
                      : '1px solid rgba(255, 255, 255, 0.3)',
                    color: scrolled 
                      ? isDark ? '#fff' : '#667eea'
                      : '#fff'
                  }}
                >
                  <ShieldCheckIcon className="w-4 h-4" />
                  Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="hidden sm:inline-block font-medium transition-colors px-4 py-2 rounded-lg hover:bg-white/10"
                    style={{
                      color: scrolled 
                        ? isDark ? '#fff' : '#667eea'
                        : '#fff'
                    }}
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="px-6 py-3 rounded-xl font-medium hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center gap-2"
                    style={{
                      background: scrolled 
                        ? isDark 
                          ? 'rgba(255, 255, 255, 0.95)'
                          : 'rgba(102, 126, 234, 0.95)'
                        : 'rgba(255, 255, 255, 0.95)',
                      color: scrolled 
                        ? isDark ? '#667eea' : '#fff'
                        : '#667eea',
                      boxShadow: scrolled 
                        ? '0 8px 32px rgba(0, 0, 0, 0.1)'
                        : '0 8px 32px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <RocketLaunchIcon className="w-4 h-4" />
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-16 overflow-hidden" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      }}>
        {/* Floating decorative elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div
            style={{
              position: 'absolute', width: 400, height: 400, borderRadius: '50%',
              background: 'rgba(255,255,255,0.08)', top: -100, left: -100,
              filter: 'blur(60px)'
            }}
          />
          <div
            style={{
              position: 'absolute', width: 300, height: 300, borderRadius: '50%',
              background: 'rgba(255,255,255,0.06)', bottom: 100, right: -50,
              filter: 'blur(50px)'
            }}
          />
          <div
            style={{
              position: 'absolute', width: 200, height: 200, borderRadius: '50%',
              background: 'rgba(255,255,255,0.1)', top: '40%', left: '60%',
              filter: 'blur(40px)'
            }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {/* Trust badge */}
            <div className="inline-flex items-center px-6 py-3 rounded-full mb-10 backdrop-blur-md"
              style={{
                background: 'rgba(255, 255, 255, 0.15)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mr-3"></div>
              <span className="font-semibold text-sm text-white">
                Trusted by 2,500+ brands & creators worldwide
              </span>
            </div>

            {/* Main headline */}
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-6 leading-tight">
              <span className="block text-white mb-2" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                Connect Brands with
              </span>
              <span className="block bg-gradient-to-r from-white via-purple-100 to-pink-100 bg-clip-text text-transparent" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                Authentic Micro-Creators
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg max-w-3xl mx-auto mb-8 leading-relaxed text-white/90" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
              The first trusted marketplace for micro-influencers (1k-100k followers) and brands. 
              Data-driven matching, secure payments, and real performance analytics in one powerful platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mb-8 sm:mb-12">
              {isAuthenticated ? (
                <Link
                  to={dashboardPath}
                  className="group relative px-6 py-3 rounded-xl font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden flex items-center justify-center gap-2"
                  style={{
                    background: 'rgba(255, 255, 255, 0.95)',
                    color: '#667eea',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
                  }}
                >
                  <ShieldCheckIcon className="w-5 h-5" />
                  Open Dashboard
                  <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              ) : (
                <>
                  <Link
                    to="/signup?type=brand"
                    className="group relative px-6 py-3 rounded-xl font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300 overflow-hidden flex items-center justify-center gap-2"
                    style={{
                      background: 'rgba(255, 255, 255, 0.95)',
                      color: '#667eea',
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
                    }}
                  >
                    <MagnifyingGlassIcon className="w-5 h-5" />
                    Find Creators 
                    <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                  <Link
                    to="/signup?type=creator"
                    className="px-6 py-3 rounded-xl font-semibold text-lg border-2 hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-md"
                    style={{
                      background: 'rgba(255, 255, 255, 0.1)',
                      color: '#fff',
                      borderColor: 'rgba(255, 255, 255, 0.3)'
                    }}
                  >
                    <ArrowTrendingUpIcon className="w-6 h-6" />
                    Start Earning Today
                  </Link>
                </>
              )}
            </div>

            {/* Platform icons */}
            <div className="flex items-center justify-center space-x-6 mb-12">
              {platforms.map((platform, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="group relative"
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300 backdrop-blur-md"
                    style={{
                      background: 'rgba(150, 150, 250, 0.2)',
                      border: '1px solid rgba(150, 150, 250, 0.3)',
                      boxShadow: '0 2px 8px rgba(150, 150, 250, 0.1)'
                    }}
                  >
                    <platform.icon className="w-5 h-5 text-white" />
                  </div>
                  
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center group"
                >
                  <div className="relative inline-block mb-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center backdrop-blur-md group-hover:scale-110 transition-transform"
                      style={{
                        background: 'rgba(150, 150, 250, 0.2)',
                        border: '1px solid rgba(150, 150, 250, 0.3)'
                      }}
                    >
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                  </div>
                  <div className="text-2xl md:text-3xl font-bold text-white mb-1" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}>
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-white/90 mb-1">{stat.label}</div>
                  <div className="text-xs text-white/70">{stat.suffix}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16" style={{
        background: isDark 
          ? 'linear-gradient(135deg, #16213e 0%, #0f3460 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.95) 100%)'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md mb-4"
                style={{
                  background: isDark 
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(102, 126, 234, 0.1)',
                  color: isDark ? '#fff' : '#667eea',
                  border: isDark 
                    ? '1px solid rgba(255, 255, 255, 0.2)'
                    : '1px solid rgba(102, 126, 234, 0.2)'
                }}
              >
                Features
              </span>
              <h2 className={`text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold mb-6 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`} style={{ textShadow: isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none' }}>
                Everything you need to succeed
              </h2>
              <p className={`text-base max-w-2xl mx-auto ${
                isDark ? 'text-white/80' : 'text-gray-600'
              }`}>
                Powerful tools designed for both brands and creators to collaborate seamlessly
              </p>
            </motion.div>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative rounded-2xl p-6 hover:shadow-xl transition-all duration-500 backdrop-blur-md"
                style={{
                  background: isDark 
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.8)',
                  border: isDark 
                    ? '1px solid rgba(255, 255, 255, 0.1)'
                    : '1px solid rgba(0, 0, 0, 0.05)',
                  transform: 'translateY(0)',
                  boxShadow: isDark 
                    ? '0 10px 30px rgba(0, 0, 0, 0.2)'
                    : '0 10px 30px rgba(0, 0, 0, 0.1)'
                }}
                whileHover={{ 
                  y: -10,
                  boxShadow: isDark 
                    ? '0 20px 40px rgba(0, 0, 0, 0.3)'
                    : '0 20px 40px rgba(0, 0, 0, 0.15)'
                }}
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500"
                  style={{
                    background: 'rgba(150, 150, 250, 0.2)',
                    boxShadow: '0 2px 8px rgba(150, 150, 250, 0.1)'
                  }}
                >
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                
                {/* Content */}
                <h3 className={`text-lg font-bold mb-3 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>{feature.title}</h3>
                <p className={`text-sm leading-relaxed mb-4 ${
                  isDark ? 'text-white/70' : 'text-gray-600'
                }`}>{feature.description}</p>
                
                {/* Benefits */}
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className={`flex items-center text-sm ${
                      isDark ? 'text-white/60' : 'text-gray-500'
                    }`}>
                      <CheckBadgeIcon className="w-5 h-5 mr-2 flex-shrink-0" style={{ color: '#3b82f6' }} />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16" style={{
        background: isDark 
          ? 'linear-gradient(135deg, #0f3460 0%, #16213e 100%)'
          : 'linear-gradient(135deg, rgba(249,250,251,0.95) 0%, rgba(255,255,255,0.95) 100%)'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md mb-4"
                style={{
                  background: isDark 
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(102, 126, 234, 0.1)',
                  color: isDark ? '#fff' : '#667eea',
                  border: isDark 
                    ? '1px solid rgba(255, 255, 255, 0.2)'
                    : '1px solid rgba(102, 126, 234, 0.2)'
                }}
              >
                Process
              </span>
              <h2 className={`text-2xl md:text-4xl font-bold mb-6 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`} style={{ textShadow: isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none' }}>
                How InfluenceX Works
              </h2>
              <p className={`text-base max-w-2xl mx-auto ${
                isDark ? 'text-white/80' : 'text-gray-600'
              }`}>
                From signup to successful collaboration in 5 simple steps
              </p>
            </motion.div>
          </div>

          {/* Steps */}
          <div className="relative">
            {/* Steps grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative text-center group"
                >
                  {/* Step icon */}
                  <div className={`relative w-16 h-16 mx-auto mb-4 bg-gradient-to-r ${step.color} rounded-xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <step.icon className="w-6 h-6 text-white" />
                  </div>
                  
                  {/* Content */}
                  <h3 className={`text-base font-bold mb-2 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>{step.title}</h3>
                  <p className={`text-xs leading-relaxed ${
                    isDark ? 'text-white/70' : 'text-gray-600'
                  }`}>{step.description}</p>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Demo video placeholder */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mt-16 relative rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="aspect-w-16 aspect-h-9 bg-gradient-to-r from-[#667eea] to-[#764ba2]">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className={`w-20 h-20 mx-auto rounded-full flex items-center mb-4 cursor-pointer transition-colors ${
                    isDark ? 'bg-white/10 hover:bg-white/20' : 'bg-white/20 hover:bg-white/30'
                  }`}>
                    <div className="w-0 h-0 border-t-8 border-t-transparent border-l-16 border-l-white border-b-8 border-b-transparent ml-2"></div>
                  </div>
                  <p className="text-lg font-semibold">Watch how InfluenceX works (2 min)</p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-16" style={{
        background: isDark 
          ? 'linear-gradient(135deg, #0f3460 0%, #16213e 100%)'
          : 'linear-gradient(135deg, rgba(249,250,251,0.95) 0%, rgba(255,255,255,0.95) 100%)'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md mb-4"
                style={{
                  background: isDark 
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(102, 126, 234, 0.1)',
                  color: isDark ? '#fff' : '#667eea',
                  border: isDark 
                    ? '1px solid rgba(255, 255, 255, 0.2)'
                    : '1px solid rgba(102, 126, 234, 0.2)'
                }}
              >
                Success Stories
              </span>
              <h2 className={`text-2xl md:text-4xl font-bold mb-6 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`} style={{ textShadow: isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none' }}>
                Trusted by brands & creators
              </h2>
              <p className={`text-base max-w-2xl mx-auto ${
                isDark ? 'text-white/80' : 'text-gray-600'
              }`}>
                Join thousands of successful collaborations on InfluenceX
              </p>
            </motion.div>
          </div>

          {/* Testimonials carousel */}
          <div className="relative max-w-5xl mx-auto">
            <motion.div
              key={activeTestimonial}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
              className="rounded-2xl p-6 md:p-8 backdrop-blur-md"
              style={{
                background: isDark 
                  ? 'rgba(255, 255, 255, 0.05)'
                  : 'rgba(255, 255, 255, 0.8)',
                border: isDark 
                  ? '1px solid rgba(255, 255, 255, 0.1)'
                  : '1px solid rgba(0, 0, 0, 0.05)',
                boxShadow: isDark 
                  ? '0 20px 40px rgba(0, 0, 0, 0.2)'
                  : '0 20px 40px rgba(0, 0, 0, 0.1)'
              }}
            >
              <div className="flex flex-col md:flex-row items-center gap-10">
                {/* Avatar */}
                <div className="relative">
                  <div className="relative">
                    <img
                      src={testimonials[activeTestimonial].image}
                      alt={testimonials[activeTestimonial].name}
                      className="w-20 h-20 md:w-24 md:h-24 rounded-2xl object-cover shadow-xl"
                    />
                    <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                  <div className="absolute -bottom-2 -right-2 w-6 h-6 bg-green-400 rounded-full border-3 border-white shadow-lg animate-pulse"></div>
                </div>

                {/* Content */}
                <div className="flex-1 text-center md:text-left">
                  {/* Rating */}
                  <div className="flex items-center justify-center md:justify-start mb-6">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} className="w-6 h-6 text-yellow-400 fill-current" />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className={`text-base md:text-lg italic mb-6 font-medium ${
                    isDark ? 'text-white/90' : 'text-gray-700'
                  }`} style={{ lineHeight: '1.6' }}>
                    "{testimonials[activeTestimonial].content}"
                  </p>

                  {/* Author */}
                  <div>
                    <h4 className={`text-lg font-bold mb-2 ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>{testimonials[activeTestimonial].name}</h4>
                    <p className="text-sm font-semibold" style={{ color: '#667eea' }}>{testimonials[activeTestimonial].role}</p>
                    <p className={`text-sm mt-1 ${
                      isDark ? 'text-white/60' : 'text-gray-500'
                    }`}>{testimonials[activeTestimonial].company}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Dots */}
            <div className="flex items-center justify-center mt-12 space-x-3">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className="transition-all duration-300 rounded-full"
                  style={{
                    width: index === activeTestimonial ? '32px' : '12px',
                    height: '12px',
                    background: index === activeTestimonial 
                      ? '#667eea' 
                      : isDark 
                        ? 'rgba(255, 255, 255, 0.3)'
                        : 'rgba(0, 0, 0, 0.2)',
                    transform: index === activeTestimonial ? 'scale(1.1)' : 'scale(1)'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-20 flex flex-wrap items-center justify-center gap-12">
            {['TechCrunch', 'Forbes', 'Business Insider', 'Inc 5000'].map((badge, index) => (
              <div key={index} className={`font-semibold text-xl backdrop-blur-md px-6 py-3 rounded-2xl ${
                isDark ? 'text-white/60' : 'text-gray-500'
              }`}
                style={{
                  background: isDark 
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(0, 0, 0, 0.03)',
                  border: isDark 
                    ? '1px solid rgba(255, 255, 255, 0.1)'
                    : '1px solid rgba(0, 0, 0, 0.05)'
                }}
              >
                {badge}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-16" style={{
        background: isDark 
          ? 'linear-gradient(135deg, #16213e 0%, #0f3460 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.95) 100%)'
      }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md mb-4"
                style={{
                  background: isDark 
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(102, 126, 234, 0.1)',
                  color: isDark ? '#fff' : '#667eea',
                  border: isDark 
                    ? '1px solid rgba(255, 255, 255, 0.2)'
                    : '1px solid rgba(102, 126, 234, 0.2)'
                }}
              >
                Pricing
              </span>
              <h2 className={`text-2xl md:text-4xl font-bold mb-6 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`} style={{ textShadow: isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none' }}>
                Simple, transparent pricing
              </h2>
              <p className={`text-base max-w-2xl mx-auto ${
                isDark ? 'text-white/80' : 'text-gray-600'
              }`}>
                Choose the perfect plan for your business. All plans include a 14-day free trial.
              </p>
            </motion.div>
          </div>

          {/* Pricing cards */}
          <div className={`grid grid-cols-1 ${isCreatorUser ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3'} gap-8`}>
            {pricingTiers.map((tier, index) => (
              (() => {
                const action = getPricingAction(tier, index);
                return (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative rounded-2xl p-6 transition-all duration-500 backdrop-blur-md"
                style={{
                  background: isDark 
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.8)',
                  border: isDark 
                    ? '1px solid rgba(255, 255, 255, 0.1)'
                    : '1px solid rgba(0, 0, 0, 0.05)',
                  transform: tier.popular ? 'translateY(-8px)' : 'translateY(0)',
                  boxShadow: tier.popular
                    ? isDark 
                      ? '0 30px 60px rgba(102, 126, 234, 0.2)'
                      : '0 30px 60px rgba(102, 126, 234, 0.15)'
                    : isDark 
                      ? '0 10px 30px rgba(0, 0, 0, 0.2)'
                      : '0 10px 30px rgba(0, 0, 0, 0.1)'
                }}
                whileHover={{ 
                  y: tier.popular ? -12 : -8,
                  boxShadow: tier.popular
                    ? isDark 
                      ? '0 40px 80px rgba(102, 126, 234, 0.3)'
                      : '0 40px 80px rgba(102, 126, 234, 0.2)'
                    : isDark 
                      ? '0 20px 40px rgba(0, 0, 0, 0.3)'
                      : '0 20px 40px rgba(0, 0, 0, 0.15)'
                }}
              >
                {tier.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="inline-block px-6 py-2 rounded-full text-sm font-bold backdrop-blur-md"
                      style={{
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        color: '#fff',
                        boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)'
                      }}
                    >
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="text-center mb-6">
                  <h3 className={`text-lg font-bold mb-3 ${
                    isDark ? 'text-white' : 'text-gray-900'
                  }`}>{tier.name}</h3>
                  <div className="flex items-center justify-center mb-3">
                    <span className={`text-3xl font-bold ${
                      isDark ? 'text-white' : 'text-gray-900'
                    }`}>{tier.price}</span>
                    <span className={`ml-1 text-sm ${
                      isDark ? 'text-white/60' : 'text-gray-500'
                    }`}>{tier.period}</span>
                  </div>
                  <p className={`text-xs ${
                    isDark ? 'text-white/70' : 'text-gray-600'
                  }`}>{tier.description}</p>
                </div>

                {/* Features */}
                <ul className="space-y-3 mb-6">
                  {tier.features.map((feature, i) => (
                    <li key={i} className={`flex items-start ${
                      isDark ? 'text-white/80' : 'text-gray-700'
                    }`}>
                      <CheckBadgeIcon className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" style={{ color: '#3b82f6' }} />
                      <span className="text-xs leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {action.disabled ? (
                  <span
                    className="block w-full py-3 px-4 text-center rounded-xl font-semibold backdrop-blur-md cursor-not-allowed"
                    style={{
                      background: isDark 
                        ? 'rgba(255, 255, 255, 0.05)'
                        : 'rgba(0, 0, 0, 0.05)',
                      color: isDark ? 'text-white/40' : 'text-gray-400',
                      border: isDark 
                        ? '1px solid rgba(255, 255, 255, 0.1)'
                        : '1px solid rgba(0, 0, 0, 0.05)'
                    }}
                  >
                    {action.label}
                  </span>
                ) : (
                  <Link
                    to={action.to}
                    className={`block w-full py-3 px-4 text-center rounded-xl font-semibold transition-all duration-300 hover:scale-105 ${
                      tier.popular
                        ? ''
                        : ''
                    }`}
                    style={{
                      background: tier.popular
                        ? 'linear-gradient(135deg, #667eea, #764ba2)'
                        : isDark 
                          ? 'rgba(255, 255, 255, 0.1)'
                          : 'rgba(255, 255, 255, 0.9)',
                      color: tier.popular
                        ? '#fff'
                        : isDark 
                          ? '#fff'
                          : '#667eea',
                      border: tier.popular
                        ? 'none'
                        : isDark 
                          ? '1px solid rgba(255, 255, 255, 0.2)'
                          : '1px solid rgba(102, 126, 234, 0.2)',
                      boxShadow: tier.popular
                        ? '0 8px 24px rgba(102, 126, 234, 0.3)'
                        : 'none'
                    }}
                  >
                    {action.label}
                  </Link>
                )}
              </motion.div>
                );
              })()
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16" style={{
        background: isDark 
          ? 'linear-gradient(135deg, #16213e 0%, #0f3460 100%)'
          : 'linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(249,250,251,0.95) 100%)'
      }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider backdrop-blur-md mb-4"
                style={{
                  background: isDark 
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'rgba(102, 126, 234, 0.1)',
                  color: isDark ? '#fff' : '#667eea',
                  border: isDark 
                    ? '1px solid rgba(255, 255, 255, 0.2)'
                    : '1px solid rgba(102, 126, 234, 0.2)'
                }}
              >
                FAQ
              </span>
              <h2 className={`text-2xl md:text-4xl font-bold mb-6 ${
                isDark ? 'text-white' : 'text-gray-900'
              }`} style={{ textShadow: isDark ? '0 2px 4px rgba(0,0,0,0.3)' : 'none' }}>
                Frequently asked questions
              </h2>
              <p className={`text-base max-w-2xl mx-auto ${
                isDark ? 'text-white/80' : 'text-gray-600'
              }`}>
                Got questions? We've got answers.
              </p>
            </motion.div>
          </div>

          {/* FAQ items */}
          <div className="space-y-6">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="rounded-xl p-6 transition-all duration-300 backdrop-blur-md"
                style={{
                  background: isDark 
                    ? 'rgba(255, 255, 255, 0.05)'
                    : 'rgba(255, 255, 255, 0.8)',
                  border: isDark 
                    ? '1px solid rgba(255, 255, 255, 0.1)'
                    : '1px solid rgba(0, 0, 0, 0.05)',
                  boxShadow: isDark 
                    ? '0 10px 30px rgba(0, 0, 0, 0.2)'
                    : '0 10px 30px rgba(0, 0, 0, 0.1)'
                }}
                whileHover={{ 
                  y: -4,
                  boxShadow: isDark 
                    ? '0 20px 40px rgba(0, 0, 0, 0.3)'
                    : '0 20px 40px rgba(0, 0, 0, 0.15)'
                }}
              >
                <h3 className={`text-lg font-bold mb-3 ${
                  isDark ? 'text-white' : 'text-gray-900'
                }`}>{faq.question}</h3>
                <p className={`text-sm leading-relaxed ${
                  isDark ? 'text-white/70' : 'text-gray-600'
                }`}>{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 relative overflow-hidden" style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
      }}>
        {/* Background pattern */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-64 h-64 rounded-full filter blur-3xl"
            style={{
              background: 'rgba(255,255,255,0.1)'
            }}
          ></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full filter blur-3xl"
            style={{
              background: 'rgba(255,255,255,0.1)'
            }}
          ></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-4xl font-bold text-white mb-4" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
              Ready to grow your influence?
            </h2>
            <p className="text-base text-white/90 mb-8 max-w-2xl mx-auto" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
              Join the fastest growing influencer marketing platform. Sign up today and start your first campaign.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={isBrandUser ? '/brand/search' : isCreatorUser ? '/creator/available-deals' : '/signup?type=brand'}
                className="px-6 py-3 rounded-xl font-semibold text-lg hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2"
                style={{
                  background: 'rgba(255, 255, 255, 0.95)',
                  color: '#667eea',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.1)'
                }}
              >
                {isCreatorUser ? 'Find Deals' : 'Find Creators'}
                <ChevronRightIcon className="w-6 h-6" />
              </Link>
              {!isBrandUser && !isCreatorUser && (
                <Link
                  to="/signup?type=creator"
                  className="px-6 py-3 rounded-xl font-semibold text-lg border-2 hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center gap-2 backdrop-blur-md"
                  style={{
                    background: 'rgba(255, 255, 255, 0.1)',
                    color: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.3)'
                  }}
                >
                  Start Earning
                  <ArrowTrendingUpIcon className="w-6 h-6" />
                </Link>
              )}
            </div>

            {/* Trust indicator */}
            <p className="text-white/90 uppercase text-xs mt-8 font-medium">
              For influencers: No credit card required • Cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

   

      {/* Custom animations */}
      <style>{`
        @keyframes blob {
          0% { transform: translate(0px, 0px) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
}