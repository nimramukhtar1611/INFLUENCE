import React, { useState } from 'react';
import {
  HelpCircle,
  Search,
  BookOpen,
  MessageSquare,
  FileText,
  Video,
  Mail,
  Phone,
  MessageCircle,
  ChevronRight,
  ExternalLink,
  ThumbsUp,
  ThumbsDown,
  Award,
  Shield,
  DollarSign,
  Users,
  Camera,
  Settings
} from 'lucide-react';
import Button from '../../components/UI/Button';
import Input from '../UI/Input';

const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const [feedback, setFeedback] = useState(null);

  const categories = [
    { id: 'all', label: 'All Topics', icon: HelpCircle },
    { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
    { id: 'brands', label: 'For Brands', icon: Award },
    { id: 'creators', label: 'For Creators', icon: Users },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'account', label: 'Account & Security', icon: Shield },
    { id: 'campaigns', label: 'Campaigns', icon: Camera },
    { id: 'technical', label: 'Technical Support', icon: Settings }
  ];

  const popularTopics = [
    {
      title: 'How to create your first campaign',
      views: '12.5K views',
      category: 'brands'
    },
    {
      title: 'Setting up your creator profile',
      views: '8.2K views',
      category: 'creators'
    },
    {
      title: 'Understanding payment processing',
      views: '15.3K views',
      category: 'payments'
    },
    {
      title: 'Verifying your social media accounts',
      views: '6.7K views',
      category: 'creators'
    },
    {
      title: 'Deal negotiation best practices',
      views: '5.9K views',
      category: 'brands'
    },
    {
      title: 'Resolving disputes',
      views: '4.2K views',
      category: 'account'
    }
  ];

  const faqs = [
    {
      question: 'How do I get paid?',
      answer: 'Payments are processed through our secure escrow system. Once you complete a deal and the brand approves your deliverables, the funds are released to your account. You can then withdraw to your preferred payment method.',
      category: 'payments'
    },
    {
      question: 'What fees does InfluenceX charge?',
      answer: 'We charge a 10% commission on all completed deals. There are no fees for creating an account or browsing opportunities. Premium features are available through subscription plans.',
      category: 'payments'
    },
    {
      question: 'How do I verify my account?',
      answer: 'Account verification requires connecting your social media accounts and providing valid identification. Once verified, you\'ll receive a verified badge on your profile.',
      category: 'account'
    },
    {
      question: 'Can I negotiate deals?',
      answer: 'Yes! Our platform supports negotiation. You can send counter-offers with different terms, budgets, or timelines directly through the deal interface.',
      category: 'brands'
    },
    {
      question: 'What happens if there\'s a dispute?',
      answer: 'Our dispute resolution center allows both parties to present their case. An admin will review and help mediate a fair resolution. Funds remain in escrow until resolved.',
      category: 'account'
    },
    {
      question: 'How do I increase my chances of getting deals?',
      answer: 'Complete your profile, connect all social accounts, maintain high engagement rates, and deliver quality content. Positive reviews from brands also help boost your visibility.',
      category: 'creators'
    }
  ];

  const filteredFaqs = activeCategory === 'all' 
    ? faqs 
    : faqs.filter(faq => faq.category === activeCategory);

  const guides = [
    {
      title: 'Complete Guide for Brands',
      description: 'Everything you need to know about finding and working with creators',
      icon: Award,
      color: 'bg-blue-100 text-blue-600',
      articles: 12
    },
    {
      title: 'Creator Success Handbook',
      description: 'Tips and strategies to grow your influence and earnings',
      icon: Users,
      color: 'bg-green-100 text-green-600',
      articles: 15
    },
    {
      title: 'Payment & Tax Guide',
      description: 'Understanding payments, fees, and tax obligations',
      icon: DollarSign,
      color: 'bg-purple-100 text-purple-600',
      articles: 8
    },
    {
      title: 'Account Security Best Practices',
      description: 'Keep your account safe with these security tips',
      icon: Shield,
      color: 'bg-yellow-100 text-yellow-600',
      articles: 6
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">How can we help you?</h1>
        <p className="text-gray-600 mb-8">Search our help center or browse topics below</p>
        
        {/* Search */}
        <div className="max-w-2xl mx-auto relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search for answers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-4 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {categories.map((category) => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => setActiveCategory(category.id)}
              className={`p-4 rounded-xl text-center transition-all ${
                activeCategory === category.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white hover:bg-gray-50 text-gray-700'
              }`}
            >
              <Icon className="w-6 h-6 mx-auto mb-2" />
              <span className="text-xs font-medium">{category.label}</span>
            </button>
          );
        })}
      </div>

      {/* Popular Topics */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Popular Topics</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {popularTopics.map((topic, index) => (
            <button
              key={index}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-indigo-600 hover:bg-indigo-50 transition-colors text-left"
            >
              <div>
                <p className="font-medium text-gray-900">{topic.title}</p>
                <p className="text-sm text-gray-500">{topic.views}</p>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </button>
          ))}
        </div>
      </div>

      {/* Guides */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Featured Guides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {guides.map((guide, index) => {
            const Icon = guide.icon;
            return (
              <div key={index} className="bg-white p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 ${guide.color} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{guide.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{guide.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">{guide.articles} articles</span>
                  <button className="text-indigo-600 text-sm font-medium hover:text-indigo-700">
                    Read Guide →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FAQs */}
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Frequently Asked Questions</h2>
        <div className="space-y-4">
          {filteredFaqs.map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
              <details className="group">
                <summary className="flex items-center justify-between p-4 cursor-pointer list-none">
                  <span className="font-medium text-gray-900">{faq.question}</span>
                  <ChevronRight className="w-5 h-5 text-gray-500 group-open:rotate-90 transition-transform" />
                </summary>
                <div className="px-4 pb-4">
                  <p className="text-gray-600">{faq.answer}</p>
                  
                  {/* Feedback */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Was this helpful?</span>
                    <button 
                      onClick={() => setFeedback('up')}
                      className={`p-1 rounded hover:bg-gray-100 ${feedback === 'up' ? 'text-green-600' : 'text-gray-400'}`}
                    >
                      <ThumbsUp className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setFeedback('down')}
                      className={`p-1 rounded hover:bg-gray-100 ${feedback === 'down' ? 'text-red-600' : 'text-gray-400'}`}
                    >
                      <ThumbsDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </details>
            </div>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 rounded-xl shadow-lg text-white">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
          <p className="text-indigo-100 mb-8">
            Can't find what you're looking for? Our support team is here to help you 24/7.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              variant="secondary"
              icon={MessageSquare}
              className="bg-white text-indigo-600 hover:bg-indigo-50"
            >
              Live Chat
            </Button>
            <Button
              variant="outline"
              icon={Mail}
              className="border-white text-white hover:bg-white hover:bg-opacity-10"
            >
              Email Support
            </Button>
            <Button
              variant="outline"
              icon={Phone}
              className="border-white text-white hover:bg-white hover:bg-opacity-10"
            >
              Call Us
            </Button>
          </div>
          <p className="text-sm text-indigo-200 mt-6">
            Average response time: &lt; 2 hours
          </p>
        </div>
      </div>
    </div>
  );
};

export default HelpCenter;