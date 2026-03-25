// pages/Terms.jsx
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  FileText,
  Scale,
  Globe,
  Lock,
  Users,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import Footer from '../components/Layout/Footer';

const Terms = () => {
  const [activeSection, setActiveSection] = useState(null);
  const [accepted, setAccepted] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);

  const sections = [
    {
      id: 'agreement',
      title: '1. Agreement to Terms',
      icon: FileText,
      content: `
        By accessing or using the InfluenceX platform, you agree to be bound by these Terms of Service 
        and all applicable laws and regulations. If you do not agree with any part of these terms, 
        you may not access or use our services.

        These terms constitute a legally binding agreement between you and InfluenceX regarding your 
        use of the platform. We may modify these terms at any time, and such modifications shall be 
        effective immediately upon posting. Your continued use of the platform after any modifications 
        indicates your acceptance of the modified terms.
      `
    },
    {
      id: 'eligibility',
      title: '2. Eligibility',
      icon: Users,
      content: `
        You must be at least 18 years old to use our services. By using the platform, you represent 
        and warrant that you have the right, authority, and capacity to enter into this agreement and 
        to abide by all terms and conditions.

        If you are using the platform on behalf of an organization, you represent and warrant that you 
        have the authority to bind that organization to these terms, and your acceptance of these terms 
        will be treated as acceptance by that organization.
      `
    },
    {
      id: 'accounts',
      title: '3. Account Registration',
      icon: Shield,
      content: `
        To use certain features of our platform, you must register for an account. You agree to provide 
        accurate, current, and complete information during the registration process and to update such 
        information to keep it accurate, current, and complete.

        You are responsible for safeguarding your password and for all activities that occur under your 
        account. You agree to notify us immediately of any unauthorized use of your account. We reserve 
        the right to disable any user account at any time if you have failed to comply with any provision 
        of these terms.
      `
    },
    {
      id: 'fees',
      title: '4. Fees and Payments',
      icon: Scale,
      content: `
        InfluenceX charges fees for certain services as described on our pricing page. All fees are 
        non-refundable except as required by law or as expressly stated in these terms.

        For brand users, you agree to pay all fees associated with your account, including platform fees 
        and transaction fees. Fees are charged based on the plan you select and any additional services 
        you purchase.

        For creator users, you agree to pay applicable platform fees on completed deals. Fees are 
        automatically deducted from payments before they are released to you.

        All fees are exclusive of taxes. You are responsible for paying all taxes associated with your 
        use of our services.
      `
    },
    {
      id: 'deals',
      title: '5. Deals and Transactions',
      icon: Globe,
      content: `
        The platform facilitates deals between brands and creators. InfluenceX is not a party to any 
        agreement between users and does not guarantee the performance or fulfillment of any deal.

        Brands agree to:
        • Provide accurate campaign requirements
        • Fund escrow accounts promptly
        • Review deliverables in a timely manner
        • Release payments upon approval

        Creators agree to:
        • Deliver content as agreed
        • Meet deadlines
        • Provide original, high-quality work
        • Comply with brand guidelines

        Disputes between users should first be attempted to be resolved between the parties. If unable 
        to resolve, users may utilize our dispute resolution process.
      `
    },
    {
      id: 'content',
      title: '6. Content and Intellectual Property',
      icon: Lock,
      content: `
        Users retain ownership of their content. By posting content on the platform, you grant 
        InfluenceX a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and 
        display such content solely for the purpose of operating and improving the platform.

        For content created through deals:
        • Brands receive usage rights as specified in the deal agreement
        • Creators retain ownership of their original content
        • Both parties agree to respect each other's intellectual property rights

        You represent and warrant that you own all content you post or have the right to grant these 
        licenses. You agree not to post content that infringes on any third-party rights.
      `
    },
    {
      id: 'prohibited',
      title: '7. Prohibited Activities',
      icon: AlertCircle,
      content: `
        You agree not to engage in any of the following prohibited activities:
        • Violating any laws or regulations
        • Infringing on intellectual property rights
        • Posting false, misleading, or deceptive content
        • Harassing, abusing, or harming others
        • Interfering with the platform's operation
        • Attempting to gain unauthorized access
        • Using bots or automated methods
        • Engaging in fraudulent activities
        • Manipulating engagement metrics
        • Buying or selling fake followers
        • Circumventing our fee structure
      `
    },
    {
      id: 'termination',
      title: '8. Termination',
      icon: AlertCircle,
      content: `
        You may terminate your account at any time by contacting support. Upon termination, you will 
        lose access to your account and any content associated with it.

        We may suspend or terminate your account at any time for any reason, including violation of 
        these terms. We will notify you of such termination when possible.

        Upon termination:
        • You must complete any pending deals
        • Funds in escrow will be handled according to deal terms
        • You remain responsible for fees incurred before termination
        • Certain provisions of these terms will survive termination
      `
    },
    {
      id: 'liability',
      title: '9. Limitation of Liability',
      icon: Scale,
      content: `
        To the maximum extent permitted by law, InfluenceX shall not be liable for any indirect, 
        incidental, special, consequential, or punitive damages, including without limitation, loss of 
        profits, data, use, goodwill, or other intangible losses, resulting from:
        • Your use or inability to use the platform
        • Any conduct or content of any third party
        • Any content obtained from the platform
        • Unauthorized access, use, or alteration of your transmissions or content

        Our total liability to you shall not exceed the amount you paid us during the twelve months 
        prior to the event giving rise to liability.
      `
    },
    {
      id: 'disputes',
      title: '10. Dispute Resolution',
      icon: Scale,
      content: `
        Any dispute arising out of or relating to these terms or your use of the platform shall be 
        resolved through binding arbitration in accordance with the rules of the American Arbitration 
        Association. The arbitration shall take place in San Francisco, California.

        You agree to waive any right to participate in a class action lawsuit or class-wide arbitration. 
        Any claims must be brought in your individual capacity and not as a plaintiff or class member 
        in any purported class or representative proceeding.

        Notwithstanding the foregoing, either party may seek injunctive relief in any court of competent 
        jurisdiction to protect its intellectual property rights.
      `
    },
    {
      id: 'governing',
      title: '11. Governing Law',
      icon: Globe,
      content: `
        These terms shall be governed by and construed in accordance with the laws of the State of 
        California, without regard to its conflict of law provisions. Our failure to enforce any right 
        or provision of these terms will not be considered a waiver of those rights.
      `
    },
    {
      id: 'changes',
      title: '12. Changes to Terms',
      icon: FileText,
      content: `
        We reserve the right to modify these terms at any time. We will notify users of material 
        changes via email or through the platform. Your continued use of the platform after such 
        modifications constitutes your acceptance of the revised terms.
      `
    }
  ];

  const toggleSection = (id) => {
    setActiveSection(activeSection === id ? null : id);
  };

  const handleAccept = () => {
    if (accepted) {
      setShowAcceptModal(true);
    }
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
            Terms of Service
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Please read these terms carefully before using InfluenceX
          </p>
          <div className="flex items-center justify-center gap-4">
            <span className="text-sm text-gray-500">Last Updated: {lastUpdated}</span>
            <span className="w-1 h-1 bg-gray-300 rounded-full"></span>
            <span className="text-sm text-gray-500">Version 2.0</span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          {/* Quick Summary */}
          <div className="bg-indigo-50 rounded-2xl p-8 mb-12">
            <h2 className="text-xl font-bold text-indigo-900 mb-4">Quick Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">For Brands</p>
                  <p className="text-sm text-gray-600">Secure escrow payments, verified creators, dispute resolution</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">For Creators</p>
                  <p className="text-sm text-gray-600">Guaranteed payments, portfolio building, fair terms</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Both Parties</p>
                  <p className="text-sm text-gray-600">Protected by our dispute resolution process</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                <div>
                  <p className="font-semibold text-gray-900">Platform Fee</p>
                  <p className="text-sm text-gray-600">10% commission on completed deals</p>
                </div>
              </div>
            </div>
          </div>

          {/* Terms Sections */}
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

          {/* Acceptance Checkbox */}
          <div className="mt-12 p-6 bg-gray-50 rounded-xl border border-gray-200">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={accepted}
                onChange={(e) => setAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <span className="text-gray-700">
                I have read and agree to the Terms of Service and Privacy Policy. I understand that 
                these terms constitute a binding legal agreement.
              </span>
            </label>
            
            <button
              onClick={handleAccept}
              disabled={!accepted}
              className={`mt-4 w-full py-3 px-4 rounded-xl font-semibold transition-all ${
                accepted
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              Accept Terms
            </button>
          </div>

          {/* Contact Info */}
          <div className="mt-8 text-center text-sm text-gray-500">
            <p>
              Questions about our Terms? Contact us at{' '}
              <a href="mailto:legal@influencex.com" className="text-indigo-600 hover:text-indigo-700">
                legal@influencex.com
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* Acceptance Modal */}
      {showAcceptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6">
            <div className="text-center mb-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Terms Accepted</h3>
            </div>
            <p className="text-gray-600 mb-6">
              Thank you for accepting our Terms of Service. You can now continue using InfluenceX.
            </p>
            <button
              onClick={() => setShowAcceptModal(false)}
              className="w-full py-3 px-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default Terms;