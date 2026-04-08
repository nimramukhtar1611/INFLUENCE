import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  User,
  Calendar,
  DollarSign,
  FileText,
  MessageSquare,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  Eye,
  Edit,
  Send,
  Paperclip,
  MoreVertical,
  Star,
  ThumbsUp,
  Flag,
  Upload,
  Image,
  Video,
  Link2,
  X,
  Plus,
  Shield,
  Award,
  TrendingUp,
  Users,
  Heart,
  Share2,
  Globe,
  MapPin,
  Briefcase,
  ChevronRight,
  AlertTriangle,
  HelpCircle,
  Settings,
  Bell,
  Mail,
  Phone,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Ban,
  Trash2
} from 'lucide-react';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import Input from '../../components/UI/Input';
import Select from '../../components/UI/Select';
import { getStatusColor, getStatusIconColor } from '../../utils/colorScheme';
import { formatCurrency, formatDate, timeAgo } from '../../utils/helpers';

const DealDetails = ({ userType = 'brand' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showCounterModal, setShowCounterModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [files, setFiles] = useState([]);
  const [message, setMessage] = useState('');
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');

  // Mock deal data based on user type
  const deal = userType === 'brand' ? {
    id: id,
    campaign: 'Summer Collection Launch',
    creator: {
      name: 'Sarah Johnson',
      handle: '@sarahstyle',
      avatar: 'https://via.placeholder.com/60',
      rating: 4.9,
      totalDeals: 24,
      completedDeals: 22,
      responseRate: '98%',
      location: 'New York, USA',
      niche: 'Fashion & Lifestyle',
      followers: '45.2K',
      engagement: '4.8%'
    },
    type: 'Instagram Post + Stories',
    budget: '$450',
    status: 'in-progress',
    created: '2024-06-10',
    deadline: '2024-06-20',
    description: 'Create engaging content featuring our new summer collection. Looking for authentic lifestyle shots that showcase the products naturally.',
    requirements: [
      'Must include product clearly visible',
      'Use hashtag #NikeSummer2024',
      'Tag @nikeofficial',
      'Natural lighting preferred',
      'Family-friendly content only'
    ],
    deliverables: [
      {
        id: 1,
        type: 'Instagram Post',
        description: '2 lifestyle photos',
        status: 'completed',
        submitted: '2024-06-15',
        files: ['post-1.jpg', 'post-2.jpg'],
        feedback: 'Great work! Love the composition.',
        approved: true
      },
      {
        id: 2,
        type: 'Instagram Story',
        description: '3 stories',
        status: 'pending',
        submitted: null,
        files: [],
        feedback: null,
        approved: false
      },
      {
        id: 3,
        type: 'Behind the Scenes',
        description: '1 BTS reel',
        status: 'in-progress',
        submitted: null,
        files: [],
        feedback: null,
        approved: false
      }
    ],
    messages: [
      {
        id: 1,
        from: 'Sarah Johnson',
        fromType: 'creator',
        content: 'Hi! I\'ve started working on the content. Here are some initial concepts.',
        time: '2024-06-12 10:30',
        attachments: ['concepts.pdf'],
        read: true
      },
      {
        id: 2,
        from: 'You',
        fromType: 'brand',
        content: 'These look great! Love the second concept. Can\'t wait to see the final results.',
        time: '2024-06-12 14:15',
        attachments: [],
        read: true
      },
      {
        id: 3,
        from: 'Sarah Johnson',
        fromType: 'creator',
        content: 'Just uploaded the first batch of images. Please review when you get a chance!',
        time: '2024-06-15 09:45',
        attachments: ['post-1.jpg', 'post-2.jpg'],
        read: false
      }
    ],
    timeline: [
      {
        date: '2024-06-10',
        event: 'Deal created',
        user: 'Nike',
        type: 'create'
      },
      {
        date: '2024-06-11',
        event: 'Deal accepted by creator',
        user: 'Sarah Johnson',
        type: 'accept'
      },
      {
        date: '2024-06-12',
        event: 'Initial concepts shared',
        user: 'Sarah Johnson',
        type: 'message'
      },
      {
        date: '2024-06-15',
        event: 'First deliverables submitted',
        user: 'Sarah Johnson',
        type: 'submit'
      }
    ],
    contract: {
      id: 'CONT-2024-001',
      signed: '2024-06-11',
      terms: 'Standard terms apply',
      file: 'contract.pdf'
    },
    payment: {
      total: '$450',
      platformFee: '$45',
      netAmount: '$405',
      status: 'in-escrow',
      releaseDate: '2024-06-20'
    }
  } : {
    id: id,
    campaign: 'Summer Collection Launch',
    brand: {
      name: 'Nike',
      logo: 'https://via.placeholder.com/60',
      rating: 4.8,
      totalDeals: 156,
      completedDeals: 142,
      responseRate: '95%',
      location: 'Beaverton, Oregon',
      industry: 'Fashion & Apparel',
      campaigns: 45,
      spent: '$1.2M'
    },
    type: 'Instagram Post + Stories',
    budget: '$450',
    status: 'in-progress',
    created: '2024-06-10',
    deadline: '2024-06-20',
    description: 'Create engaging content featuring our new summer collection. Looking for authentic lifestyle shots that showcase the products naturally.',
    requirements: [
      'Must include product clearly visible',
      'Use hashtag #NikeSummer2024',
      'Tag @nikeofficial',
      'Natural lighting preferred',
      'Family-friendly content only'
    ],
    deliverables: [
      {
        id: 1,
        type: 'Instagram Post',
        description: '2 lifestyle photos',
        status: 'completed',
        submitted: '2024-06-15',
        files: ['post-1.jpg', 'post-2.jpg'],
        feedback: 'Great work! Love the composition.',
        approved: true
      },
      {
        id: 2,
        type: 'Instagram Story',
        description: '3 stories',
        status: 'pending',
        submitted: null,
        files: [],
        feedback: null,
        approved: false
      },
      {
        id: 3,
        type: 'Behind the Scenes',
        description: '1 BTS reel',
        status: 'in-progress',
        submitted: null,
        files: [],
        feedback: null,
        approved: false
      }
    ],
    messages: [
      {
        id: 1,
        from: 'You',
        fromType: 'creator',
        content: 'Hi! I\'ve started working on the content. Here are some initial concepts.',
        time: '2024-06-12 10:30',
        attachments: ['concepts.pdf'],
        read: true
      },
      {
        id: 2,
        from: 'Nike',
        fromType: 'brand',
        content: 'These look great! Love the second concept. Can\'t wait to see the final results.',
        time: '2024-06-12 14:15',
        attachments: [],
        read: true
      },
      {
        id: 3,
        from: 'You',
        fromType: 'creator',
        content: 'Just uploaded the first batch of images. Please review when you get a chance!',
        time: '2024-06-15 09:45',
        attachments: ['post-1.jpg', 'post-2.jpg'],
        read: true
      }
    ],
    timeline: [
      {
        date: '2024-06-10',
        event: 'Deal created',
        user: 'Nike',
        type: 'create'
      },
      {
        date: '2024-06-11',
        event: 'Deal accepted by you',
        user: 'You',
        type: 'accept'
      },
      {
        date: '2024-06-12',
        event: 'Initial concepts shared',
        user: 'You',
        type: 'message'
      },
      {
        date: '2024-06-15',
        event: 'First deliverables submitted',
        user: 'You',
        type: 'submit'
      }
    ],
    contract: {
      id: 'CONT-2024-001',
      signed: '2024-06-11',
      terms: 'Standard terms apply',
      file: 'contract.pdf'
    },
    payment: {
      total: '$450',
      platformFee: '$45',
      netAmount: '$405',
      status: 'in-escrow',
      expectedRelease: '2024-06-20'
    }
  };

  const getStandardizedStatusColor = (status, type = 'status') => {
    return getStatusColor(status, type, false);
  };

  const getStatusIcon = (status) => {
    switch(status?.toLowerCase()) {
      case 'completed': 
      case 'approved': return CheckCircle;
      case 'pending': 
      case 'in-progress': return Clock;
      case 'revision': return AlertCircle;
      case 'cancelled': return AlertCircle;
      case 'in-escrow': return AlertCircle;
      default: return AlertCircle;
    }
  };

  const handleFileUpload = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles([...files, ...newFiles]);
  };

  const removeFile = (index) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const handleSendMessage = () => {
    if (message.trim() || files.length > 0) {
      console.log('Sending message:', message, files);
      setMessage('');
      setFiles([]);
    }
  };

  const handleSubmitDeliverables = () => {
    console.log('Submitting deliverables');
    setShowSubmitModal(false);
  };

  const handleCounterOffer = () => {
    console.log('Sending counter offer');
    setShowCounterModal(false);
  };

  const handleCancelDeal = () => {
    console.log('Cancelling deal');
    setShowCancelModal(false);
    navigate(userType === 'brand' ? '/brand/deals' : '/creator/deals');
  };

  const handleApproveAll = () => {
    console.log('Approving all deliverables');
    setShowApproveModal(false);
  };

  const handleRequestRevision = () => {
    console.log('Requesting revision');
    setShowRevisionModal(false);
  };

  const handleRaiseDispute = () => {
    console.log('Raising dispute');
    setShowDisputeModal(false);
  };

  const handleSubmitReview = () => {
    console.log('Submitting review:', rating, feedback);
    setShowApproveModal(false);
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    // Show toast notification
  };

  return (
    <div className="h-screen overflow-hidden space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link 
          to={userType === 'brand' ? '/brand/deals' : '/creator/deals'} 
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{deal.campaign}</h1>
            <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1 ${getStandardizedStatusColor(deal.status, 'deal')}`}>
              {React.createElement(getStatusIcon(deal.status), { className: `w-3 h-3 ${getStatusIconColor(deal.status)}` })}
              {deal.status}
            </span>
          </div>
          <p className="text-gray-600">Deal ID: {deal.id}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" icon={Share2}>
            Share
          </Button>
          <Button variant="outline" size="sm" icon={Download}>
            Contract
          </Button>
          <Button variant="outline" size="sm" icon={MoreVertical} />
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <DollarSign className="w-4 h-4" />
            Budget
          </div>
          <p className="text-2xl font-bold text-gray-900">{deal.budget}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Calendar className="w-4 h-4" />
            Deadline
          </div>
          <p className="text-2xl font-bold text-gray-900">{deal.deadline}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <CheckCircle className="w-4 h-4" />
            Progress
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {deal.deliverables.filter(d => d.status === 'completed').length}/{deal.deliverables.length}
          </p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Clock className="w-4 h-4" />
            Created
          </div>
          <p className="text-2xl font-bold text-gray-900">{deal.created}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <nav className="flex space-x-8 min-w-max">
          {['overview', 'deliverables', 'messages', 'timeline', 'contract', 'payment'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
              {tab === 'messages' && deal.messages.filter(m => !m.read).length > 0 && (
                <span className="ml-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 inline-flex items-center justify-center">
                  {deal.messages.filter(m => !m.read).length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="h-[calc(100vh-200px)] overflow-y-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Deal Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Description */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Deal Details</h2>
              <p className="text-gray-600 mb-4">{deal.description}</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Campaign</p>
                  <p className="font-medium">{deal.campaign}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-xs text-gray-500 mb-1">Type</p>
                  <p className="font-medium">{deal.type}</p>
                </div>
              </div>
            </div>

            {/* Requirements */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Requirements</h2>
              <ul className="space-y-2">
                {deal.requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-gray-600">{req}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Deliverables Summary */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Deliverables</h2>
              <div className="space-y-3">
                {deal.deliverables.map((del) => (
                  <div key={del.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {del.type.includes('Post') ? (
                        <Image className="w-5 h-5 text-blue-600" />
                      ) : del.type.includes('Story') ? (
                        <Video className="w-5 h-5 text-purple-600" />
                      ) : (
                        <Video className="w-5 h-5 text-green-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900">{del.type}</p>
                        <p className="text-xs text-gray-500">{del.description}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStandardizedStatusColor(del.status, 'deliverable')}`}>
                      {React.createElement(getStatusIcon(del.status), { className: `w-3 h-3 ${getStatusIconColor(del.status)}` })}
                      {del.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column - Partner Info & Actions */}
          <div className="space-y-6">
            {/* Partner Info */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                {userType === 'brand' ? 'Creator' : 'Brand'}
              </h2>
              <div className="flex items-center gap-4 mb-4">
                <img 
                  src={userType === 'brand' ? deal.creator.avatar : deal.brand.logo} 
                  alt={userType === 'brand' ? deal.creator.name : deal.brand.name} 
                  className="w-16 h-16 rounded-full"
                />
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {userType === 'brand' ? deal.creator.name : deal.brand.name}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {userType === 'brand' ? deal.creator.handle : ''}
                  </p>
                  <div className="flex items-center mt-1">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm ml-1">
                      {userType === 'brand' ? deal.creator.rating : deal.brand.rating}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3 text-sm">
                {userType === 'brand' ? (
                  <>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-500 text-xs">Total Deals</p>
                      <p className="font-medium">{deal.creator.totalDeals}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-500 text-xs">Completed</p>
                      <p className="font-medium">{deal.creator.completedDeals}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-500 text-xs">Response Rate</p>
                      <p className="font-medium">{deal.creator.responseRate}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-500 text-xs">Location</p>
                      <p className="font-medium">{deal.creator.location}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-500 text-xs">Total Campaigns</p>
                      <p className="font-medium">{deal.brand.campaigns}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-500 text-xs">Total Spent</p>
                      <p className="font-medium">{deal.brand.spent}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-500 text-xs">Response Rate</p>
                      <p className="font-medium">{deal.brand.responseRate}</p>
                    </div>
                    <div className="bg-gray-50 p-2 rounded">
                      <p className="text-gray-500 text-xs">Industry</p>
                      <p className="font-medium">{deal.brand.industry}</p>
                    </div>
                  </>
                )}
              </div>

              <div className="mt-4 text-gray-500 text-sm font-medium flex items-center">
                Profile Information
                <ChevronRight className="w-4 h-4 ml-1 text-gray-400" />
              </div>
            </div>

            {/* Actions */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions</h2>
              <div className="space-y-3">
                {userType === 'creator' && deal.status === 'in-progress' && (
                  <Button
                    variant="primary"
                    fullWidth
                    icon={Upload}
                    onClick={() => setShowSubmitModal(true)}
                  >
                    Submit Deliverables
                  </Button>
                )}

                {userType === 'brand' && deal.status === 'in-progress' && (
                  <>
                    <Button
                      variant="success"
                      fullWidth
                      icon={ThumbsUp}
                      onClick={() => setShowApproveModal(true)}
                    >
                      Approve All
                    </Button>
                    <Button
                      variant="warning"
                      fullWidth
                      icon={Edit}
                      onClick={() => setShowRevisionModal(true)}
                    >
                      Request Revision
                    </Button>
                  </>
                )}

                <Button
                  variant="outline"
                  fullWidth
                  icon={MessageSquare}
                  onClick={() => setActiveTab('messages')}
                >
                  Send Message
                </Button>

                {(deal.status === 'pending' || deal.status === 'in-progress') && (
                  <Button
                    variant="outline"
                    fullWidth
                    icon={Edit}
                    onClick={() => setShowCounterModal(true)}
                  >
                    {userType === 'creator' ? 'Negotiate Terms' : 'Counter Offer'}
                  </Button>
                )}

                {deal.status !== 'cancelled' && deal.status !== 'completed' && (
                  <Button
                    variant="danger"
                    fullWidth
                    icon={Ban}
                    onClick={() => setShowCancelModal(true)}
                  >
                    Cancel Deal
                  </Button>
                )}

                <Button
                  variant="danger"
                  fullWidth
                  icon={Flag}
                  onClick={() => setShowDisputeModal(true)}
                >
                  Report Issue
                </Button>
              </div>
            </div>

            {/* Contract Summary */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Contract</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Contract ID</span>
                  <span className="text-sm font-mono">{deal.contract.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Signed</span>
                  <span className="text-sm">{deal.contract.signed}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Terms</span>
                  <span className="text-sm">{deal.contract.terms}</span>
                </div>
                <Button variant="outline" size="sm" fullWidth icon={Download}>
                  Download Contract
                </Button>
              </div>
            </div>

            {/* Payment Summary */}
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Payment</h2>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Amount</span>
                  <span className="text-sm font-bold">{deal.payment.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Platform Fee</span>
                  <span className="text-sm text-gray-600">{deal.payment.platformFee}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                  <span className="text-sm font-medium">Net Amount</span>
                  <span className="text-sm font-bold text-green-600">{deal.payment.netAmount}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Status</span>
                  <span className={`px-2 py-1 text-xs rounded-full inline-flex items-center gap-1 ${getStandardizedStatusColor(deal.payment.status, 'payment')}`}>
                    {React.createElement(getStatusIcon(deal.payment.status), { className: `w-3 h-3 ${getStatusIconColor(deal.payment.status)}` })}
                    {deal.payment.status}
                  </span>
                </div>
                {userType === 'creator' && deal.payment.expectedRelease && (
                  <p className="text-xs text-gray-500">
                    Expected release: {deal.payment.expectedRelease}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'deliverables' && (
        <div className="h-[calc(100vh-200px)] overflow-y-auto space-y-6">
          {deal.deliverables.map((del) => (
            <div key={del.id} className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {del.type.includes('Post') ? (
                    <Image className="w-6 h-6 text-blue-600" />
                  ) : del.type.includes('Story') ? (
                    <Video className="w-6 h-6 text-purple-600" />
                  ) : (
                    <Video className="w-6 h-6 text-green-600" />
                  )}
                  <div>
                    <h3 className="font-semibold text-gray-900">{del.type}</h3>
                    <p className="text-sm text-gray-500">{del.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(del.status)}`}>
                    {del.status}
                  </span>
                  {del.approved && (
                    <ThumbsUp className="w-5 h-5 text-green-600" />
                  )}
                </div>
              </div>

              {del.files.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Submitted Files</p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {del.files.map((file, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={`https://via.placeholder.com/150`}
                          alt={file}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button className="p-2 bg-white rounded-full hover:bg-gray-100">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button className="p-2 bg-white rounded-full hover:bg-gray-100">
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Submitted: {del.submitted}</p>
                </div>
              )}

              {del.feedback && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="text-sm font-medium text-gray-700 mb-1">Feedback</p>
                  <p className="text-sm text-gray-600">{del.feedback}</p>
                </div>
              )}

              {userType === 'creator' && del.status !== 'completed' && (
                <div className="flex gap-2 mt-4">
                  <Button variant="primary" size="sm" icon={Upload} onClick={() => setShowSubmitModal(true)}>
                    Upload Files
                  </Button>
                  <Button variant="outline" size="sm" icon={Edit}>
                    Edit
                  </Button>
                </div>
              )}

              {userType === 'brand' && del.status === 'pending' && (
                <div className="flex gap-2 mt-4">
                  <Button variant="success" size="sm" icon={ThumbsUp}>
                    Approve
                  </Button>
                  <Button variant="warning" size="sm" icon={Edit}>
                    Request Changes
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {activeTab === 'messages' && (
        <div className="bg-white rounded-xl shadow-sm h-[calc(100vh-200px)] flex flex-col">
          <div className="p-4 border-b border-gray-200">
            <h2 className="font-semibold text-gray-900">
              Messages with {userType === 'brand' ? deal.creator.name : deal.brand.name}
            </h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {deal.messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.fromType === userType ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[70%] ${msg.fromType === userType ? 'bg-indigo-600 text-white' : 'bg-gray-100'} rounded-lg p-3`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium">{msg.from}</span>
                    <span className={`text-xs ${msg.fromType === userType ? 'text-indigo-200' : 'text-gray-500'}`}>
                      {msg.time}
                    </span>
                  </div>
                  <p className="text-sm">{msg.content}</p>
                  {msg.attachments.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {msg.attachments.map((file, index) => (
                        <button 
                          key={index} 
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                            msg.fromType === userType ? 'bg-indigo-500 hover:bg-indigo-400' : 'bg-gray-200 hover:bg-gray-300'
                          } transition-colors`}
                        >
                          <Paperclip className="w-3 h-3" />
                          {file}
                          <Download className="w-3 h-3 ml-1" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t border-gray-200">
            {files.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {files.map((file, index) => (
                  <div key={index} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                    <Paperclip className="w-3 h-3" />
                    <span className="text-xs">{file.name}</span>
                    <button 
                      onClick={() => removeFile(index)}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500"
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <label className="cursor-pointer p-2 border border-gray-300 rounded-lg hover:bg-gray-50">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileUpload}
                />
                <Paperclip className="w-5 h-5 text-gray-600" />
              </label>
              <button 
                onClick={handleSendMessage}
                className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={!message.trim() && files.length === 0}
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="h-[calc(100vh-200px)] overflow-y-auto bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Timeline</h2>
          <div className="relative">
            {deal.timeline.map((item, index) => (
              <div key={index} className="flex gap-4 mb-6 last:mb-0">
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full mt-1.5 ${
                    item.type === 'create' ? 'bg-blue-600' :
                    item.type === 'accept' ? 'bg-green-600' :
                    item.type === 'submit' ? 'bg-purple-600' :
                    item.type === 'message' ? 'bg-orange-600' :
                    'bg-gray-600'
                  }`}></div>
                  {index < deal.timeline.length - 1 && (
                    <div className="absolute top-4 left-1.5 w-0.5 h-12 bg-gray-200"></div>
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-gray-900">{item.event}</p>
                    <span className="text-xs text-gray-500">{item.date}</span>
                  </div>
                  <p className="text-sm text-gray-600">by {item.user}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'contract' && (
        <div className="h-[calc(100vh-200px)] overflow-y-auto bg-white p-6 rounded-xl shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Contract Details</h2>
            <Button variant="outline" icon={Download}>
              Download PDF
            </Button>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Contract ID</p>
                <p className="font-mono">{deal.contract.id}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Signed Date</p>
                <p>{deal.contract.signed}</p>
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500 mb-2">Terms & Conditions</p>
              <div className="prose prose-sm max-w-none">
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
                <ul className="mt-2 space-y-1">
                  <li>• Content must be original and not infringe on any third party rights</li>
                  <li>• Brand has the right to use content for marketing purposes</li>
                  <li>• Payment will be released within 5 business days of approval</li>
                  <li>• Either party may terminate with 7 days written notice</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center gap-4 p-4 bg-green-50 rounded-lg">
              <Shield className="w-6 h-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Contract Signed & Verified</p>
                <p className="text-sm text-green-600">Both parties have agreed to the terms</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'payment' && (
        <div className="h-[calc(100vh-200px)] overflow-y-auto bg-white p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Payment Details</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-xl text-white">
              <p className="text-sm opacity-90 mb-2">Total Amount</p>
              <p className="text-3xl font-bold mb-4">{deal.payment.total}</p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Platform Fee</span>
                  <span>{deal.payment.platformFee}</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-white border-opacity-30">
                  <span className="font-medium">Net Amount</span>
                  <span className="font-bold">{deal.payment.netAmount}</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Payment Status</p>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(deal.payment.status)}`}>
                    {deal.payment.status}
                  </span>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Release Date</p>
                <p className="font-medium">{userType === 'brand' ? deal.payment.releaseDate : deal.payment.expectedRelease}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500 mb-1">Payment Method</p>
                <p className="font-medium">Escrow (Secure)</p>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <p className="font-medium text-blue-800">Secure Escrow Protection</p>
                <p className="text-sm text-blue-600 mt-1">
                  Funds are held securely in escrow until deliverables are approved. Both parties are protected.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submit Deliverables Modal */}
      <Modal
        isOpen={showSubmitModal}
        onClose={() => setShowSubmitModal(false)}
        title="Submit Deliverables"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Deliverable
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
              {deal.deliverables.filter(d => d.status !== 'completed').map(d => (
                <option key={d.id}>{d.type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Upload Files
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <input
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="submit-files"
              />
              <label htmlFor="submit-files" className="cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">
                  Drag and drop files here, or <span className="text-indigo-600">browse</span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Support: Images, Videos (Max 100MB)
                </p>
              </label>
            </div>
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <div className="flex items-center gap-2">
                    {file.type.startsWith('image/') ? (
                      <Image className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Video className="w-4 h-4 text-purple-600" />
                    )}
                    <span className="text-sm">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <button onClick={() => removeFile(index)}>
                    <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Links (Optional)
            </label>
            <input
              type="url"
              placeholder="https://..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes for Brand
            </label>
            <textarea
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Add any additional notes..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowSubmitModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSubmitDeliverables}>
            Submit
          </Button>
        </div>
      </Modal>

      {/* Counter Offer Modal */}
      <Modal
        isOpen={showCounterModal}
        onClose={() => setShowCounterModal(false)}
        title="Counter Offer"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposed Budget
            </label>
            <input
              type="number"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Enter amount"
              defaultValue={parseInt(deal.budget.replace('$', ''))}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Proposed Deadline
            </label>
            <input
              type="date"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              defaultValue={deal.deadline}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message
            </label>
            <textarea
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Explain your proposed changes..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowCounterModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleCounterOffer}>
            Send Counter Offer
          </Button>
        </div>
      </Modal>

      {/* Cancel Deal Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Deal"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-yellow-600 bg-yellow-50 p-4 rounded-lg">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">Are you sure you want to cancel this deal? This action cannot be undone.</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason for Cancellation
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
              <option>Select a reason</option>
              <option>Change in campaign strategy</option>
              <option>Unable to meet requirements</option>
              <option>Timeline issues</option>
              <option>Budget constraints</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments
            </label>
            <textarea
              rows="3"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Please provide more details..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
            Keep Deal
          </Button>
          <Button variant="danger" onClick={handleCancelDeal}>
            Yes, Cancel Deal
          </Button>
        </div>
      </Modal>

      {/* Revision Request Modal */}
      <Modal
        isOpen={showRevisionModal}
        onClose={() => setShowRevisionModal(false)}
        title="Request Revision"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Deliverable
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
              {deal.deliverables.map(d => (
                <option key={d.id}>{d.type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Revision Details
            </label>
            <textarea
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Please describe what changes are needed..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowRevisionModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleRequestRevision}>
            Send Request
          </Button>
        </div>
      </Modal>

      {/* Approve All Modal */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve All Deliverables"
        size="lg"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-green-600 bg-green-50 p-4 rounded-lg">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              Are you sure you want to approve all deliverables? This will release the payment to the creator.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Rate the Creator
            </label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className={`p-1 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                >
                  <Star className="w-6 h-6 fill-current" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Feedback (Optional)
            </label>
            <textarea
              rows="3"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Share your experience working with this creator..."
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowApproveModal(false)}>
            Cancel
          </Button>
          <Button variant="success" onClick={handleSubmitReview}>
            Approve & Complete
          </Button>
        </div>
      </Modal>

      {/* Dispute Modal */}
      <Modal
        isOpen={showDisputeModal}
        onClose={() => setShowDisputeModal(false)}
        title="Report an Issue"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Issue Type
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
              <option>Deliverables not as agreed</option>
              <option>Payment delayed</option>
              <option>Communication issue</option>
              <option>Contract disagreement</option>
              <option>Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              rows="4"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              placeholder="Please describe the issue in detail..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Attachments (Optional)
            </label>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center">
              <input type="file" multiple className="hidden" id="dispute-files" />
              <label htmlFor="dispute-files" className="cursor-pointer">
                <p className="text-sm text-gray-600">
                  Upload screenshots or evidence
                </p>
              </label>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-lg">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> An admin will review your dispute within 24-48 hours. Both parties will be notified.
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowDisputeModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleRaiseDispute}>
            Submit Report
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default DealDetails;