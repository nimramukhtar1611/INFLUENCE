// pages/Privacy.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Lock,
  Eye,
  Database,
  Mail,
  Cookie,
  Globe,
  Users,
  Smartphone,
  FileText,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Footer from '../components/Layout/Footer';

const Privacy = () => {
  const [activeSection, setActiveSection] = useState(null);
  const [cookiePreferences, setCookiePreferences] = useState({
    essential: true,
    functional: false,
    analytics: false,
    marketing: false
  });
  const [showCookieModal, setShowCookieModal] = useState(false);

  const sections = [
    {
      id: 'introduction',
      title: '1. Introduction',
      icon: FileText,
      content: `
        At InfluenceX, we take your privacy seriously. This Privacy Policy explains how we collect, 
        use, disclose, and safeguard your information when you use our platform. Please read this 
        privacy policy carefully. If you do not agree with the terms of this privacy policy, please 
        do not access the site.

        We reserve the right to make changes to this privacy policy at any time and for any reason. 
        We will alert you about any changes by updating the "Last Updated" date of this privacy policy. 
        You are encouraged to periodically review this privacy policy to stay informed of updates.
      `
    },
    {
      id: 'collection',
      title: '2. Information We Collect',
      icon: Database,
      content: `
        We collect several types of information from and about users of our platform, including:

        Personal Information:
        • Name, email address, phone number
        • Profile information (bio, profile picture, social media handles)
        • Payment information (processed securely through Stripe)
        • Government ID (for verification purposes)

        Demographic Information:
        • Age and date of birth
        • Gender
        • Location data
        • Interests and preferences

        Technical Information:
        • IP address and device information
        • Browser type and version
        • Operating system
        • Cookies and usage data
        • Log files

        Platform Information:
        • Campaign details and performance
        • Deal history and communications
        • Ratings and reviews
        • Content you create or upload

        Social Media Information:
        • Connected account data (Instagram, YouTube, TikTok)
        • Follower counts and engagement metrics
        • Public posts and content
      `
    },
    {
      id: 'use',
      title: '3. How We Use Your Information',
      icon: Eye,
      content: `
        We use the information we collect for various purposes, including:

        Platform Operations:
        • To create and manage your account
        • To process transactions and payments
        • To facilitate deals between brands and creators
        • To verify your identity and social media accounts
        • To provide customer support

        Platform Improvement:
        • To analyze usage patterns and trends
        • To improve our matching algorithms
        • To develop new features and services
        • To conduct research and analytics

        Communications:
        • To send administrative information
        • To provide updates about your deals
        • To send marketing communications (with consent)
        • To respond to your inquiries

        Security:
        • To detect and prevent fraud
        • To protect against unauthorized access
        • To enforce our terms of service
        • To comply with legal obligations
      `
    },
    {
      id: 'sharing',
      title: '4. Sharing Your Information',
      icon: Users,
      content: `
        We may share your information in the following situations:

        With Other Users:
        • Profile information is visible to other users
        • Campaign details are shared with participating creators
        • Deal communications are shared between parties
        • Reviews and ratings are public

        With Service Providers:
        • Payment processors (Stripe, PayPal)
        • Cloud storage providers
        • Analytics services
        • Customer support tools
        • Email service providers

        Legal Requirements:
        • To comply with applicable laws and regulations
        • To respond to legal requests and court orders
        • To protect our rights and property
        • In connection with a business transfer

        With Your Consent:
        • We may share information for other purposes with your explicit consent
      `
    },
    {
      id: 'cookies',
      title: '5. Cookies and Tracking Technologies',
      icon: Cookie,
      content: `
        We use cookies and similar tracking technologies to track activity on our platform and hold 
        certain information. Cookies are files with small amount of data which may include an anonymous 
        unique identifier.

        Types of cookies we use:
        • Essential cookies: Required for platform operation
        • Functional cookies: Remember your preferences
        • Analytics cookies: Help us understand usage
        • Marketing cookies: Used for advertising

        You can instruct your browser to refuse all cookies or to indicate when a cookie is being sent. 
        However, if you do not accept cookies, you may not be able to use some portions of our platform.

        Third-party cookies:
        We use third-party services that may also place cookies on your device, including:
        • Google Analytics
        • Stripe (payment processing)
        • Social media platforms (for authentication)
      `
    },
    {
      id: 'security',
      title: '6. Data Security',
      icon: Lock,
      content: `
        We implement appropriate technical and organizational security measures to protect your personal 
        information. However, please note that no method of transmission over the internet or method of 
        electronic storage is 100% secure.

        Security measures include:
        • Encryption of data in transit (SSL/TLS)
        • Encryption of sensitive data at rest
        • Regular security assessments
        • Access controls and authentication
        • Monitoring for suspicious activity

        In the event of a data breach, we will notify affected users and relevant authorities as required 
        by law.
      `
    },
    {
      id: 'rights',
      title: '7. Your Privacy Rights',
      icon: Shield,
      content: `
        Depending on your location, you may have certain rights regarding your personal information:

        For all users:
        • Access: Request a copy of your data
        • Correction: Update inaccurate information
        • Deletion: Request deletion of your data
        • Portability: Receive your data in a portable format
        • Objection: Object to certain processing

        For EU residents (GDPR):
        • Right to be forgotten
        • Right to restrict processing
        • Right to data portability
        • Right to object to marketing
        • Right to withdraw consent

        For California residents (CCPA):
        • Right to know what personal information is collected
        • Right to delete personal information
        • Right to opt-out of sale of personal information
        • Right to non-discrimination

        To exercise your rights, please contact us at privacy@influencex.com.
      `
    },
    {
      id: 'retention',
      title: '8. Data Retention',
      icon: Database,
      content: `
        We will retain your personal information only for as long as necessary to fulfill the purposes 
        outlined in this privacy policy, unless a longer retention period is required or permitted by law.

        Retention periods:
        • Account information: Until account deletion
        • Transaction records: 7 years (tax requirements)
        • Communications: 3 years
        • Usage data: 2 years
        • Deleted accounts: 30 days (recovery period)

        After the retention period, your data will be securely deleted or anonymized.
      `
    },
    {
      id: 'children',
      title: '9. Children\'s Privacy',
      icon: Users,
      content: `
        Our platform is not intended for individuals under the age of 18. We do not knowingly collect 
        personal information from children under 18. If you become aware that a child has provided us 
        with personal information, please contact us. If we become aware that we have collected personal 
        information from a child without verification of parental consent, we will take steps to remove 
        that information from our servers.
      `
    },
    {
      id: 'international',
      title: '10. International Data Transfers',
      icon: Globe,
      content: `
        Your information may be transferred to and maintained on computers located outside of your state, 
        province, country, or other governmental jurisdiction where the data protection laws may differ 
        from those in your jurisdiction.

        If you are located outside the United States and choose to provide information to us, please note 
        that we transfer the data to the United States and process it there. Your consent to this privacy 
        policy followed by your submission of such information represents your agreement to that transfer.

        We take appropriate safeguards to ensure that your information receives an adequate level of 
        protection in the jurisdictions in which we process it, including through the use of standard 
        contractual clauses approved by the European Commission.
      `
    },
    {
      id: 'changes',
      title: '11. Changes to Privacy Policy',
      icon: FileText,
      content: `
        We may update our privacy policy from time to time. We will notify you of any changes by posting 
        the new privacy policy on this page and updating the "Last Updated" date.

        For material changes, we will provide more prominent notice, including email notification for 
        active users. You are advised to review this privacy policy periodically for any changes. Changes 
        to this privacy policy are effective when they are posted on this page.
      `
    },
    {
      id: 'contact',
      title: '12. Contact Us',
      icon: Mail,
      content: `
        If you have questions or concerns about this privacy policy or our data practices, please contact us:

        By email: privacy@influencex.com
        By phone: +1 (555) 123-4567
        By mail: 123 Market Street, Suite 100, San Francisco, CA 94105

        Our Data Protection Officer can be reached at dpo@influencex.com.

        For EU residents, you also have the right to lodge a complaint with your local data protection 
        authority.
      `
    }
  ];

  const toggleSection = (id) => {
    setActiveSection(activeSection === id ? null : id);
  };

  const handleCookieSave = () => {
    // Save cookie preferences to localStorage
    localStorage.setItem('cookiePreferences', JSON.stringify(cookiePreferences));
    setShowCookieModal(false);
  };

  const lastUpdated = 'January 1, 2024';

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
              <Link to="/pricing" className="text-gray-700 hover:text-indigo-600">Pricing</Link>
              <Link to="/about" className="text-gray-700 hover:text-indigo-600">About</Link>
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
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Privacy Policy
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            How we collect, use, and protect your data
          </p>
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm text-gray-500">Last Updated: {lastUpdated}</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span className="text-sm text-gray-500">GDPR Compliant</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span className="text-sm text-gray-500">CCPA Ready</span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          {/* Privacy Badges */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
            <div className="text-center p-4 bg-indigo-50 rounded-xl">
              <Shield className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-900">256-bit Encryption</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-xl">
              <Lock className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-900">GDPR Compliant</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-xl">
              <Eye className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-900">No Data Selling</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl">
              <Smartphone className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <p className="text-sm font-semibold text-gray-900">Secure App</p>
            </div>
          </div>

          {/* Cookie Preferences */}
          <div className="bg-gray-50 rounded-2xl p-6 mb-12">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Cookie className="w-6 h-6 text-indigo-600" />
                <h2 className="text-lg font-semibold text-gray-900">Cookie Preferences</h2>
              </div>
              <button
                onClick={() => setShowCookieModal(true)}
                className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
              >
                Manage Cookies
              </button>
            </div>
            <p className="text-sm text-gray-600">
              We use cookies to enhance your experience. You can choose which cookies to accept.
              Essential cookies are always enabled for platform functionality.
            </p>
          </div>

          {/* Privacy Sections */}
          <div className="space-y-4">
            {sections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;

              return (
                <div
                  key={section.id}
                  className="border border-gray-200 rounded-xl overflow-hidden hover:border-indigo-200 transition-colors"
                >
                  <button
                    onClick={() => toggleSection(section.id)}
                    className="w-full px-6 py-4 flex items-center justify-between bg-white hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-100 rounded-lg">
                        <Icon className="w-5 h-5 text-indigo-600" />
                      </div>
                      <h3 className="font-semibold text-gray-900 text-left">{section.title}</h3>
                    </div>
                    {isActive ? (
                      <ChevronUp className="w-5 h-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-500" />
                    )}
                  </button>
                  
                  {isActive && (
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                      <p className="text-gray-700 whitespace-pre-line leading-relaxed">
                        {section.content}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Contact Info */}
          <div className="mt-12 p-6 bg-indigo-50 rounded-xl border border-indigo-100">
            <h3 className="text-lg font-semibold text-indigo-900 mb-3">Questions About Your Privacy?</h3>
            <p className="text-indigo-800 mb-4">
              Our Data Protection Officer is here to help. Contact us for any privacy-related concerns.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <a
                href="mailto:privacy@influencex.com"
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
              >
                <Mail className="w-4 h-4" />
                privacy@influencex.com
              </a>
              <a
                href="tel:+15551234567"
                className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700"
              >
                <Smartphone className="w-4 h-4" />
                +1 (555) 123-4567
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Cookie Preferences Modal */}
      {showCookieModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Cookie Preferences</h3>
            
            <div className="space-y-4 mb-6">
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Essential Cookies</p>
                  <p className="text-xs text-gray-500">Required for platform functionality</p>
                </div>
                <input
                  type="checkbox"
                  checked={cookiePreferences.essential}
                  disabled
                  className="w-4 h-4 text-indigo-600"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Functional Cookies</p>
                  <p className="text-xs text-gray-500">Remember your preferences</p>
                </div>
                <input
                  type="checkbox"
                  checked={cookiePreferences.functional}
                  onChange={(e) => setCookiePreferences({
                    ...cookiePreferences,
                    functional: e.target.checked
                  })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Analytics Cookies</p>
                  <p className="text-xs text-gray-500">Help us improve our platform</p>
                </div>
                <input
                  type="checkbox"
                  checked={cookiePreferences.analytics}
                  onChange={(e) => setCookiePreferences({
                    ...cookiePreferences,
                    analytics: e.target.checked
                  })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">Marketing Cookies</p>
                  <p className="text-xs text-gray-500">Personalized advertising</p>
                </div>
                <input
                  type="checkbox"
                  checked={cookiePreferences.marketing}
                  onChange={(e) => setCookiePreferences({
                    ...cookiePreferences,
                    marketing: e.target.checked
                  })}
                  className="w-4 h-4 text-indigo-600 rounded"
                />
              </label>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCookieModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCookieSave}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Save Preferences
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Privacy;