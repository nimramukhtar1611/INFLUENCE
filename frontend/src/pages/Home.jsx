import { Link } from 'react-router-dom';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../hooks/useAuth';
import { useSubscription } from '../context/SubscriptionContext';
import { 
  MagnifyingGlassIcon, 
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
  MapPinIcon
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
    gradient: 'from-indigo-600 to-purple-600'
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
    gradient: 'from-indigo-600 to-purple-600'
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
      icon: MagnifyingGlassIcon,
      title: 'Smart Matching Algorithm',
      description: 'AI-powered matching finds the perfect micro-creators based on audience demographics, engagement patterns, and content style.',
      gradient: 'from-blue-600 to-indigo-600',
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
      color: 'from-blue-600 to-indigo-600'
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
      color: 'from-indigo-600 to-purple-600'
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
    { icon: FaInstagram, name: 'Instagram', color: 'text-pink-600', bg: 'bg-pink-100' },
    { icon: FaYoutube, name: 'YouTube', color: 'text-red-600', bg: 'bg-red-100' },
    { icon: FaTiktok, name: 'TikTok', color: 'text-black', bg: 'bg-gray-100' },
    { icon: FaTwitter, name: 'Twitter', color: 'text-blue-400', bg: 'bg-blue-100' },
    { icon: FaFacebook, name: 'Facebook', color: 'text-blue-600', bg: 'bg-blue-100' },
    { icon: FaLinkedin, name: 'LinkedIn', color: 'text-blue-700', bg: 'bg-blue-100' }
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
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className={`fixed top-0 w-full z-50 transition-all duration-500 ${
        scrolled ? 'bg-white/95 backdrop-blur-xl shadow-lg py-3' : 'bg-transparent py-5'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2 group">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center transform group-hover:rotate-6 transition-all duration-300">
                <span className="text-white font-bold text-xl">IX</span>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                InfluenceX
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">Features</a>
              <a href="#how-it-works" className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">How it Works</a>
              <a href="#pricing" className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">Pricing</a>
              <a href="#testimonials" className="text-gray-700 hover:text-indigo-600 transition-colors font-medium">Success Stories</a>
            </div>

            {/* Auth Buttons */}
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <Link
                  to={dashboardPath}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all duration-300"
                >
                  Go to Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="hidden sm:inline-block text-gray-700 hover:text-indigo-600 font-medium transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/signup"
                    className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:scale-105 transition-all duration-300"
                  >
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 overflow-hidden">
        {/* Background gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-purple-50"></div>
        
        {/* Animated blobs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-pink-200 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            {/* Trust badge */}
            <div className="inline-flex items-center px-4 py-2 bg-indigo-100 rounded-full mb-8">
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse mr-2"></span>
              <span className="text-indigo-800 font-semibold text-sm">Trusted by 2,500+ brands & creators worldwide</span>
            </div>

            {/* Main headline */}
            <h1 className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight">
              <span className="bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                Connect Brands with
              </span>
              <br />
              <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Authentic Micro-Creators
              </span>
            </h1>

            {/* Subheadline */}
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-10 leading-relaxed">
              The first trusted marketplace for micro-influencers (1k-100k followers) and brands. 
              Data-driven matching, secure payments, and real performance analytics in one powerful platform.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              {isAuthenticated ? (
                <Link
                  to={dashboardPath}
                  className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden"
                >
                  <span className="relative z-10 flex items-center justify-center">
                    Open Dashboard
                    <ChevronRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </Link>
              ) : (
                <>
                  <Link
                    to="/signup?type=brand"
                    className="group relative px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 overflow-hidden"
                  >
                    <span className="relative z-10 flex items-center justify-center">
                      Find Creators 
                      <ChevronRightIcon className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                    </span>
                    <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  </Link>
                  <Link
                    to="/signup?type=creator"
                    className="px-8 py-4 bg-white text-gray-900 rounded-xl font-semibold text-lg border-2 border-gray-200 hover:border-indigo-600 hover:shadow-xl hover:scale-105 transition-all duration-300 flex items-center justify-center"
                  >
                    Start Earning Today
                    <ArrowTrendingUpIcon className="w-5 h-5 ml-2" />
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
                  <div className={`w-12 h-12 ${platform.bg} rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                    <platform.icon className={`w-6 h-6 ${platform.color}`} />
                  </div>
                  <span className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {platform.name}
                  </span>
                </motion.div>
              ))}
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="text-center group"
                >
                  <div className="relative inline-block">
                    <stat.icon className="w-8 h-8 mx-auto text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  </div>
                  <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    {stat.value}
                  </div>
                  <div className="text-gray-600 font-medium mt-2">{stat.label}</div>
                  <div className="text-xs text-gray-400 mt-1">{stat.suffix}</div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">Features</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
                Everything you need to succeed
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Powerful tools designed for both brands and creators to collaborate seamlessly
              </p>
            </motion.div>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="group relative bg-white rounded-2xl p-8 hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-transparent"
              >
                {/* Background gradient on hover */}
                <div className={`absolute inset-0 bg-gradient-to-r ${feature.gradient} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>
                
                {/* Icon */}
                <div className={`w-14 h-14 bg-gradient-to-r ${feature.gradient} rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                  <feature.icon className="w-6 h-6" />
                </div>
                
                {/* Content */}
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-600 leading-relaxed mb-4">{feature.description}</p>
                
                {/* Benefits */}
                <ul className="space-y-2">
                  {feature.benefits.map((benefit, i) => (
                    <li key={i} className="flex items-center text-sm text-gray-500">
                      <CheckBadgeIcon className="w-4 h-4 text-indigo-600 mr-2" />
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
      <section id="how-it-works" className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">Process</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
                How InfluenceX Works
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                From signup to successful collaboration in 5 simple steps
              </p>
            </motion.div>
          </div>

          {/* Steps */}
          <div className="relative">
            {/* Connecting line (hidden on mobile) */}
            <div className="hidden lg:block absolute top-24 left-0 w-full h-0.5 bg-gradient-to-r from-indigo-200 via-purple-200 to-pink-200"></div>

            {/* Steps grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
              {steps.map((step, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="relative text-center group"
                >
                  {/* Step number with icon */}
                  <div className={`relative w-20 h-20 mx-auto mb-6 bg-gradient-to-r ${step.color} rounded-2xl flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-300`}>
                    <step.icon className="w-8 h-8 text-white" />
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-white rounded-full flex items-center justify-center text-sm font-bold text-indigo-600 shadow-lg">
                      {step.number}
                    </div>
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
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
            <div className="aspect-w-16 aspect-h-9 bg-gradient-to-r from-indigo-600 to-purple-600">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="w-20 h-20 mx-auto bg-white/20 rounded-full flex items-center justify-center mb-4 cursor-pointer hover:bg-white/30 transition-colors">
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
      <section id="testimonials" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">Success Stories</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
                Trusted by brands & creators
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Join thousands of successful collaborations on InfluenceX
              </p>
            </motion.div>
          </div>

          {/* Testimonials carousel */}
          <div className="relative max-w-4xl mx-auto">
            <motion.div
              key={activeTestimonial}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.5 }}
              className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 md:p-12"
            >
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={testimonials[activeTestimonial].image}
                    alt={testimonials[activeTestimonial].name}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover shadow-xl"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-green-500 w-6 h-6 rounded-full border-4 border-white"></div>
                </div>

                {/* Content */}
                <div className="flex-1 text-center md:text-left">
                  {/* Rating */}
                  <div className="flex items-center justify-center md:justify-start mb-4">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-lg md:text-xl text-gray-700 italic mb-6">
                    "{testimonials[activeTestimonial].content}"
                  </p>

                  {/* Author */}
                  <div>
                    <h4 className="font-bold text-gray-900">{testimonials[activeTestimonial].name}</h4>
                    <p className="text-indigo-600">{testimonials[activeTestimonial].role}</p>
                    <p className="text-gray-500 text-sm">{testimonials[activeTestimonial].company}</p>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Dots */}
            <div className="flex items-center justify-center mt-8 space-x-2">
              {testimonials.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveTestimonial(index)}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    index === activeTestimonial
                      ? 'w-8 bg-indigo-600'
                      : 'bg-gray-300 hover:bg-gray-400'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-16 flex flex-wrap items-center justify-center gap-8">
            {['TechCrunch', 'Forbes', 'Business Insider', 'Inc 5000'].map((badge, index) => (
              <div key={index} className="text-gray-400 font-semibold text-lg">
                {badge}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">Pricing</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
                Simple, transparent pricing
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
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
                className={`relative bg-white rounded-2xl p-8 shadow-xl transition-all duration-300 ${
                  action.disabled ? 'opacity-60' : 'hover:shadow-2xl'
                } ${
                  tier.popular ? 'ring-2 ring-indigo-600 scale-105' : ''
                }`}
              >
                {tier.popular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                      Most Popular
                    </span>
                  </div>
                )}

                {/* Header */}
                <div className="text-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                  <div className="flex items-center justify-center">
                    <span className="text-4xl font-bold text-gray-900">{tier.price}</span>
                    <span className="text-gray-500 ml-2">{tier.period}</span>
                  </div>
                  <p className="text-gray-500 mt-2">{tier.description}</p>
                </div>

                {/* Features */}
                <ul className="space-y-4 mb-8">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-center text-gray-600">
                      <CheckBadgeIcon className="w-5 h-5 text-indigo-600 mr-3 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                {action.disabled ? (
                  <span
                    className="block w-full py-3 px-6 text-center rounded-xl font-semibold bg-gray-200 text-gray-500 cursor-not-allowed"
                  >
                    {action.label}
                  </span>
                ) : (
                  <Link
                    to={action.to}
                    className={`block w-full py-3 px-6 text-center rounded-xl font-semibold transition-all duration-300 ${
                      tier.popular
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:scale-105'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    }`}
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
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-16">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">FAQ</span>
              <h2 className="text-4xl md:text-5xl font-bold mt-4 mb-6">
                Frequently asked questions
              </h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                Got questions? We've got answers.
              </p>
            </motion.div>
          </div>

          {/* FAQ items */}
          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="bg-gray-50 rounded-xl p-6 hover:shadow-md transition-shadow"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-64 h-64 bg-white rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-white rounded-full filter blur-3xl"></div>
        </div>

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to grow your influence?
            </h2>
            <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
              Join the fastest growing influencer marketing platform. Sign up today and start your first campaign.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to={isBrandUser ? '/brand/search' : isCreatorUser ? '/creator/available-deals' : '/signup?type=brand'}
                className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold text-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 flex items-center justify-center"
              >
                {isCreatorUser ? 'Find Deals' : 'Find Creators'}
                <ChevronRightIcon className="w-5 h-5 ml-2" />
              </Link>
              {!isBrandUser && !isCreatorUser && (
                <Link
                  to="/signup?type=creator"
                  className="px-8 py-4 bg-transparent text-white rounded-xl font-semibold text-lg border-2 border-white hover:bg-white/10 hover:scale-105 transition-all duration-300 flex items-center justify-center"
                >
                  Start Earning
                  <ArrowTrendingUpIcon className="w-5 h-5 ml-2" />
                </Link>
              )}
            </div>

            {/* Trust indicator */}
            <p className="text-white/80 uppercase text-sm mt-8">
           for influencers No credit card required . cancel anytime
            </p>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main footer */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            {/* Company info */}
            <div className="lg:col-span-2">
              <div className="flex items-center space-x-2 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                  <span className="font-bold text-xl">IX</span>
                </div>
                <span className="text-xl font-bold">InfluenceX</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                The trusted marketplace connecting brands with authentic micro-creators. 
                Empowering authentic collaborations since 2024.
              </p>
              
              {/* Social links */}
              <div className="flex space-x-4">
                {[FaInstagram, FaTwitter, FaLinkedin, FaFacebook].map((Icon, index) => (
                  <a
                    key={index}
                    href="#"
                    className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-indigo-600 transition-colors"
                  >
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li><a href="#features" className="text-gray-400 hover:text-white transition-colors">Features</a></li>
                <li><a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">How it Works</a></li>
                <li><a href="#pricing" className="text-gray-400 hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#testimonials" className="text-gray-400 hover:text-white transition-colors">Success Stories</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Blog</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Creator Guide</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Brand Guide</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">API Documentation</a></li>
              </ul>
            </div>

            {/* Legal & Contact */}
            <div>
              <h3 className="text-lg font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 mb-6">
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Service</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">GDPR Compliance</a></li>
                <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Cookie Policy</a></li>
              </ul>
              
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <ul className="space-y-2">
                <li className="flex items-center text-gray-400">
                  <EnvelopeIcon className="w-5 h-5 mr-2" />
                  hello@influencex.com
                </li>
                <li className="flex items-center text-gray-400">
                  <PhoneIcon className="w-5 h-5 mr-2" />
                  +1 (555) 123-4567
                </li>
                <li className="flex items-center text-gray-400">
                  <MapPinIcon className="w-5 h-5 mr-2" />
                  San Francisco, CA
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm mb-4 md:mb-0">
                © 2024 InfluenceX. All rights reserved.
              </p>
              <div className="flex space-x-6">
                <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy</a>
                <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms</a>
                <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Cookies</a>
                <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Sitemap</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

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