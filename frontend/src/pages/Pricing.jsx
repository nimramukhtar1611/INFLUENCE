// pages/Pricing.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle,
  Zap,
  Users,
  DollarSign,
  BarChart3,
  MessageSquare,
  Shield,
  Clock,
  Globe,
  Award,
  Star,
  ChevronRight,
  X
} from 'lucide-react';
import { motion } from 'framer-motion';
import Button from '../components/UI/Button';
import Footer from '../components/Layout/Footer';
import { useAuth } from '../hooks/useAuth';

const Pricing = () => {
  const { user, isAuthenticated } = useAuth();
  const [billingCycle, setBillingCycle] = useState('monthly');
  const [showEnterpriseModal, setShowEnterpriseModal] = useState(false);

  const resolvePlanLink = (planId) => {
    if (planId === 'enterprise') return '/contact';

    if (isAuthenticated && ['brand', 'creator'].includes(user?.userType)) {
      const interval = billingCycle === 'yearly' ? 'year' : 'month';
      return `/${user.userType}/subscription?plan=${planId}&interval=${interval}`;
    }

    return '/signup';
  };

  const plans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started',
      price: {
        monthly: 0,
        yearly: 0
      },
      features: [
        'Up to 3 campaigns',
        'Basic creator search',
        'Email support',
        'Standard contracts',
        'Basic analytics',
        '1 team member'
      ],
      limitations: [
        'No API access',
        'Basic filters only',
        'Standard support response (48h)'
      ],
      cta: 'Get Started',
      popular: false,
      color: 'from-gray-600 to-gray-800'
    },
    {
      id: 'starter',
      name: 'Starter',
      description: 'For growing brands',
      price: {
        monthly: 49,
        yearly: 39
      },
      features: [
        'Up to 10 campaigns',
        'Advanced creator search',
        'Priority email support',
        'Custom contracts',
        'Advanced analytics',
        'Up to 3 team members',
        'Basic API access',
        'Export reports'
      ],
      limitations: [],
      cta: 'Start Free Trial',
      popular: false,
      color: 'from-blue-600 to-indigo-600',
      savings: 20
    },
    {
      id: 'professional',
      name: 'Professional',
      description: 'For serious marketers',
      price: {
        monthly: 149,
        yearly: 119
      },
      features: [
        'Unlimited campaigns',
        'AI-powered creator matching',
        '24/7 priority support',
        'Advanced contracts with e-sign',
        'Real-time analytics',
        'Up to 10 team members',
        'Full API access',
        'Custom branding',
        'Bulk creator invites',
        'Performance reports'
      ],
      limitations: [],
      cta: 'Start Free Trial',
      popular: true,
      color: 'from-indigo-600 to-purple-600',
      savings: 20
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For large organizations',
      price: {
        monthly: 499,
        yearly: 399
      },
      features: [
        'Everything in Professional',
        'Dedicated account manager',
        'Custom integrations',
        'SLA guarantee',
        'Advanced security',
        'Unlimited team members',
        'White-label solution',
        'Custom reporting',
        'Priority feature access',
        'API rate limit increase',
        'SSO integration',
        'Compliance support'
      ],
      limitations: [],
      cta: 'Contact Sales',
      popular: false,
      color: 'from-purple-600 to-pink-600',
      savings: 20
    }
  ];

  const features = [
    {
      category: 'Campaign Management',
      items: [
        { name: 'Campaign creation', free: true, starter: true, pro: true, enterprise: true },
        { name: 'Campaign analytics', free: 'basic', starter: 'advanced', pro: 'real-time', enterprise: 'custom' },
        { name: 'A/B testing', free: false, starter: false, pro: true, enterprise: true },
        { name: 'Bulk campaign operations', free: false, starter: false, pro: true, enterprise: true }
      ]
    },
    {
      category: 'Creator Discovery',
      items: [
        { name: 'Basic search filters', free: true, starter: true, pro: true, enterprise: true },
        { name: 'Advanced filters', free: false, starter: true, pro: true, enterprise: true },
        { name: 'AI-powered matching', free: false, starter: false, pro: true, enterprise: true },
        { name: 'Saved searches', free: false, starter: true, pro: true, enterprise: true },
        { name: 'Bulk creator invites', free: false, starter: false, pro: true, enterprise: true }
      ]
    },
    {
      category: 'Analytics & Reporting',
      items: [
        { name: 'Basic analytics', free: true, starter: true, pro: true, enterprise: true },
        { name: 'Advanced metrics', free: false, starter: true, pro: true, enterprise: true },
        { name: 'Custom reports', free: false, starter: false, pro: true, enterprise: true },
        { name: 'Export data (CSV/PDF)', free: false, starter: true, pro: true, enterprise: true },
        { name: 'API access', free: false, starter: 'basic', pro: 'full', enterprise: 'full+' }
      ]
    },
    {
      category: 'Team Collaboration',
      items: [
        { name: 'Team members', free: '1', starter: '3', pro: '10', enterprise: 'unlimited' },
        { name: 'Role-based permissions', free: false, starter: true, pro: true, enterprise: true },
        { name: 'Activity logs', free: false, starter: true, pro: true, enterprise: true },
        { name: 'Audit trails', free: false, starter: false, pro: false, enterprise: true }
      ]
    },
    {
      category: 'Support',
      items: [
        { name: 'Email support', free: '48h', starter: '24h', pro: '4h', enterprise: '1h' },
        { name: 'Chat support', free: false, starter: false, pro: true, enterprise: true },
        { name: 'Phone support', free: false, starter: false, pro: false, enterprise: true },
        { name: 'Dedicated account manager', free: false, starter: false, pro: false, enterprise: true },
        { name: 'SLA guarantee', free: false, starter: false, pro: false, enterprise: '99.9%' }
      ]
    },
    {
      category: 'Security & Compliance',
      items: [
        { name: 'SSL encryption', free: true, starter: true, pro: true, enterprise: true },
        { name: 'Two-factor authentication', free: true, starter: true, pro: true, enterprise: true },
        { name: 'SSO integration', free: false, starter: false, pro: false, enterprise: true },
        { name: 'GDPR compliance', free: true, starter: true, pro: true, enterprise: true },
        { name: 'Data export', free: true, starter: true, pro: true, enterprise: true },
        { name: 'Audit logs', free: false, starter: false, pro: false, enterprise: true }
      ]
    }
  ];

  const faqs = [
    {
      question: 'Can I change plans later?',
      answer: 'Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.'
    },
    {
      question: 'What payment methods do you accept?',
      answer: 'We accept all major credit cards (Visa, Mastercard, American Express) and PayPal. For Enterprise plans, we also support bank transfers.'
    },
    {
      question: 'Is there a free trial?',
      answer: 'Yes, all paid plans come with a 14-day free trial. No credit card required to start your trial.'
    },
    {
      question: 'What happens when I exceed my plan limits?',
      answer: "We'll notify you when you're approaching your limits. You can upgrade your plan or purchase additional credits."
    },
    {
      question: 'Do you offer discounts for non-profits?',
      answer: 'Yes, we offer special pricing for qualified non-profit organizations. Please contact our sales team for more information.'
    },
    {
      question: 'Can I cancel anytime?',
      answer: 'Yes, you can cancel your subscription at any time. If you cancel, you will continue to have access until the end of your billing period.'
    }
  ];

  const getFeatureValue = (feature, plan) => {
    const value = feature[plan];
    if (typeof value === 'boolean') {
      return value ? <CheckCircle className="w-5 h-5 text-green-500" /> : <X className="w-5 h-5 text-gray-300" />;
    }
    if (value === 'basic') return <span className="text-sm text-gray-600">Basic</span>;
    if (value === 'advanced') return <span className="text-sm text-indigo-600 font-medium">Advanced</span>;
    if (value === 'real-time') return <span className="text-sm text-purple-600 font-medium">Real-time</span>;
    if (value === 'custom') return <span className="text-sm text-purple-600 font-medium">Custom</span>;
    if (value === 'full') return <span className="text-sm text-green-600 font-medium">Full</span>;
    if (value === 'full+') return <span className="text-sm text-green-600 font-medium">Full+</span>;
    if (value === '48h') return <span className="text-sm text-gray-600">48h</span>;
    if (value === '24h') return <span className="text-sm text-indigo-600">24h</span>;
    if (value === '4h') return <span className="text-sm text-purple-600">4h</span>;
    if (value === '1h') return <span className="text-sm text-green-600">1h</span>;
    if (value === '99.9%') return <span className="text-sm text-green-600">99.9%</span>;
    if (typeof value === 'string') return <span className="text-sm">{value}</span>;
    return value;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-xl border-b border-gray-200 fixed top-0 w-full z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">IX</span>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                InfluenceX
              </span>
            </Link>

            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-gray-700 hover:text-indigo-600">Home</Link>
              <Link to="/about" className="text-gray-700 hover:text-indigo-600">About</Link>
              <Link to="/pricing" className="text-indigo-600 font-medium">Pricing</Link>
              <Link to="/contact" className="text-gray-700 hover:text-indigo-600">Contact</Link>
            </div>

            <div className="flex items-center space-x-4">
              <Link to="/login" className="text-gray-700 hover:text-indigo-600">Sign In</Link>
              <Link
                to="/signup"
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:shadow-lg transition-all"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <span className="text-indigo-600 font-semibold text-sm uppercase tracking-wider">
              Pricing
            </span>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mt-4 mb-6">
              Simple, transparent pricing
            </h1>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
              Choose the perfect plan for your business. All plans include a 14-day free trial.
            </p>

            {/* Billing Toggle */}
            <div className="inline-flex items-center bg-gray-100 p-1 rounded-xl mb-12">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  billingCycle === 'monthly'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('yearly')}
                className={`px-6 py-2 rounded-lg font-medium transition-all flex items-center ${
                  billingCycle === 'yearly'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Yearly
                <span className="ml-2 text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                  Save 20%
                </span>
              </button>
            </div>

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {plans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className={`relative bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 ${
                    plan.popular ? 'ring-2 ring-indigo-600 transform scale-105' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                      <span className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-1 rounded-full text-sm font-semibold">
                        Most Popular
                      </span>
                    </div>
                  )}

                  <div className="p-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                    <p className="text-gray-600 text-sm mb-4">{plan.description}</p>
                    
                    <div className="mb-4">
                      <span className="text-4xl font-bold text-gray-900">
                        ${billingCycle === 'monthly' ? plan.price.monthly : plan.price.yearly}
                      </span>
                      <span className="text-gray-500 ml-2">
                        /{billingCycle === 'monthly' ? 'mo' : 'yr'}
                      </span>
                    </div>

                    {plan.savings > 0 && billingCycle === 'yearly' && (
                      <p className="text-sm text-green-600 mb-4">
                        Save ${(plan.price.monthly * 12 - plan.price.yearly * 12).toFixed(0)}/year
                      </p>
                    )}

                    <Link
                      to={resolvePlanLink(plan.id)}
                      onClick={(e) => {
                        if (plan.id === 'enterprise') {
                          e.preventDefault();
                          setShowEnterpriseModal(true);
                        }
                      }}
                      className={`block w-full py-3 px-4 text-center rounded-xl font-semibold transition-all duration-300 ${
                        plan.popular
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:shadow-lg hover:scale-105'
                          : plan.id === 'free'
                          ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                          : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {plan.cta}
                    </Link>
                  </div>

                  <div className="p-6 border-t border-gray-100">
                    <p className="text-sm font-semibold text-gray-900 mb-4">What's included:</p>
                    <ul className="space-y-3">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-start text-sm">
                          <CheckCircle className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-600">{feature}</span>
                        </li>
                      ))}
                    </ul>
                    
                    {plan.limitations.length > 0 && (
                      <>
                        <p className="text-sm font-semibold text-gray-900 mt-4 mb-2">Limitations:</p>
                        <ul className="space-y-2">
                          {plan.limitations.map((limitation, i) => (
                            <li key={i} className="flex items-start text-sm text-gray-500">
                              <X className="w-4 h-4 text-gray-400 mr-2 mt-0.5 flex-shrink-0" />
                              <span>{limitation}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Feature Comparison Table */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Compare all features
          </h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">Feature</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Free</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Starter</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Professional</th>
                  <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">Enterprise</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {features.map((category, idx) => (
                  <React.Fragment key={idx}>
                    <tr className="bg-gray-50">
                      <td colSpan="5" className="px-6 py-3 text-sm font-semibold text-gray-900">
                        {category.category}
                      </td>
                    </tr>
                    {category.items.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-700">{item.name}</td>
                        <td className="px-6 py-4 text-center">
                          {getFeatureValue(item, 'free')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getFeatureValue(item, 'starter')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getFeatureValue(item, 'pro')}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {getFeatureValue(item, 'enterprise')}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Frequently asked questions
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6"
              >
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{faq.question}</h3>
                <p className="text-gray-600">{faq.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-indigo-600 to-purple-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Ready to grow your influence?
          </h2>
          <p className="text-xl text-white/90 mb-8">
            Join thousands of brands and creators already using InfluenceX.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/signup"
              className="px-8 py-4 bg-white text-indigo-600 rounded-xl font-semibold hover:shadow-2xl hover:scale-105 transition-all"
            >
              Start Free Trial
            </Link>
            <Link
              to="/contact"
              className="px-8 py-4 bg-transparent text-white rounded-xl font-semibold border-2 border-white hover:bg-white/10 transition-all"
            >
              Contact Sales
            </Link>
          </div>
          <p className="text-white/80 text-sm mt-6">
            No credit card required. 14-day free trial on all paid plans.
          </p>
        </div>
      </section>

      {/* Enterprise Contact Modal */}
      {showEnterpriseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Contact Sales</h3>
            <p className="text-gray-600 mb-6">
              Fill out the form below and our enterprise team will get back to you within 24 hours.
            </p>
            
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="John Doe"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Work Email *
                </label>
                <input
                  type="email"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="john@company.com"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name *
                </label>
                <input
                  type="text"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Company Inc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  rows="3"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Tell us about your needs..."
                />
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEnterpriseModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Pricing;