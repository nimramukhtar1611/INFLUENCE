import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  User, 
  Instagram, 
  Youtube, 
  Twitter, 
  Star, 
  Users, 
  Heart, 
  ArrowLeft,
  Mail,
  Calendar,
  MapPin,
  CheckCircle,
  TrendingUp,
  Award,
  MessageCircle,
  DollarSign,
  Target,
  Zap,
  Shield,
  Globe
} from 'lucide-react';
import brandService from '../../services/brandService';
import { formatNumber } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import Loader from '../../components/Common/Loader';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const CreatorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [creator, setCreator] = useState(null);

  useEffect(() => {
    fetchCreator();
  }, [id]);

  const fetchCreator = async () => {
    try {
      setLoading(true);
      const res = await brandService.getCreatorDetails(id);
      if (res?.success) {
        setCreator(res.creator || res);
      } else {
        toast.error('Creator not found');
        navigate('/brand/search');
      }
    } catch (error) {
      toast.error('Failed to load creator');
      navigate('/brand/search');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <Loader fullScreen />;
  if (!creator) return null;

  const completedDealsCount =
    creator.stats?.completedDeals ||
    creator.stats?.completedCampaigns ||
    0;

  const averageRating = creator.stats?.averageRating?.toFixed(1) || '0.0';
  const engagementRate = creator.averageEngagement?.toFixed(1) || '0';

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      isDark ? 'bg-gray-900' : 'bg-slate-100'
    }`}>
      {/* Back Button */}
      <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <button 
          onClick={() => navigate(-1)} 
          className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 text-sm font-medium backdrop-blur-sm ${
            isDark 
              ? 'bg-gray-800/80 border border-gray-700 text-gray-200 hover:bg-gray-700/80 hover:text-white' 
              : 'bg-white/80 border border-purple-200 text-purple-600 hover:bg-purple-50 hover:text-purple-700'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Search</span>
        </button>
      </div>

      {/* Main Profile Card */}
      <div className="container mx-auto px-4 sm:px-6 pb-10 sm:pb-12">
        <div className="overflow-hidden backdrop-blur-sm">
          {/* Cover Section - Modern gradient with profile content */}
          <div className={`relative overflow-hidden ${
            isDark ? 'bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900' : 'bg-gradient-to-br from-purple-600 via-purple-500 to-indigo-600'
          }`}>
            <div className={`absolute inset-0 ${
              isDark 
                ? 'bg-gradient-to-r from-purple-900/50 to-transparent' 
                : 'bg-gradient-to-r from-purple-700/30 to-transparent'
            }`}></div>
            {/* Decorative elements */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 blur-2xl"></div>
            
            {/* Profile Content Inside Gradient */}
            <div className="relative z-10 px-5 sm:px-8 py-6 sm:py-8">
              <div className="flex flex-col lg:flex-row items-center gap-5 lg:gap-6">
                {/* Avatar Section */}
                <div className="relative flex-shrink-0">
                  <div className={`w-24 h-24 sm:w-28 sm:h-28 rounded-full border-4 shadow-2xl overflow-hidden backdrop-blur-sm ${
                    isDark ? 'border-purple-700 bg-purple-800/50' : 'border-white bg-white/90'
                  }`}>
                    {creator.profilePicture ? (
                      <img 
                        src={creator.profilePicture} 
                        alt={creator.displayName} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className={`w-full h-full flex items-center justify-center ${
                        isDark ? 'bg-purple-800/50' : 'bg-purple-100'
                      }`}>
                        <User className={`w-12 h-12 ${isDark ? 'text-purple-300' : 'text-purple-600'}`} />
                      </div>
                    )}
                  </div>
                  {creator.verified && (
                    <div className="absolute bottom-2 right-2 w-7 h-7 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>

                {/* Name, Handle and Rating */}
                <div className="flex-1 text-center lg:text-left">
                  <h1 className={`text-2xl sm:text-3xl font-bold mb-1 ${
                    isDark ? 'text-white' : 'text-white'
                  }`}>
                    {creator.displayName}
                  </h1>
                  <p className={`text-base mb-3 ${
                    isDark ? 'text-purple-200' : 'text-purple-100'
                  }`}>
                    @{creator.handle}
                  </p>
                  
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3 mb-4">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-sm border ${
                      isDark 
                        ? 'bg-yellow-500/20 border-yellow-400/30' 
                        : 'bg-yellow-400/20 border-yellow-300/30'
                    }`}>
                      <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                      <span className={`font-semibold text-base ${
                        isDark ? 'text-yellow-200' : 'text-yellow-100'
                      }`}>
                        {averageRating}
                      </span>
                      <span className={`text-xs ${
                        isDark ? 'text-purple-200' : 'text-purple-100'
                      }`}>
                        ({creator.stats?.totalReviews || 0} reviews)
                      </span>
                    </div>
                    
                    {creator.status === 'available' && (
                      <div className={`flex items-center gap-2 px-3 py-2 rounded-full backdrop-blur-sm border ${
                        isDark 
                          ? 'bg-green-500/20 border-green-400/30' 
                          : 'bg-green-400/20 border-green-300/30'
                      }`}>
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className={`text-xs font-medium ${
                          isDark ? 'text-green-200' : 'text-green-100'
                        }`}>
                          Available
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Button 
                      variant="primary" 
                      size="lg"
                      onClick={() => navigate(`/brand/createdeal?creator=${creator._id}`)}
                      className={`!shadow-lg hover:!shadow-xl transition-all duration-300 !px-5 !py-2.5 !rounded-lg !text-sm !font-semibold !border-0 transform hover:scale-105 ${
                        isDark 
                          ? '!bg-gradient-to-r !from-pink-500 !to-orange-500 hover:!from-pink-600 hover:!to-orange-600 !text-white' 
                          : '!bg-gradient-to-r !from-pink-500 !to-orange-500 hover:!from-pink-600 hover:!to-orange-600 !text-white'
                      }`}
                    >
                      <DollarSign className="w-4 h-4 mr-1.5" />
                      Send Offer
                    </Button>
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => navigate('/brand/search')}
                      className={`!shadow-lg hover:!shadow-xl transition-all duration-300 !px-5 !py-2.5 !rounded-lg !text-sm !font-medium transform hover:scale-105 ${
                        isDark 
                          ? '!border-purple-400 !text-purple-200 hover:!bg-purple-800/50 hover:!text-white' 
                          : '!border-white/50 !text-white hover:!bg-white/20 hover:!text-white'
                      }`}
                    >
                      <Users className="w-4 h-4 mr-1.5" />
                      Find More
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Content */}
          <div className="px-5 sm:px-8 pb-6 sm:pb-8">
            {/* Bio Section */}
            {creator.bio && (
              <div className={`mb-8 p-5 sm:p-6 rounded-2xl backdrop-blur-sm border shadow-lg ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700' 
                  : 'bg-gradient-to-r from-purple-50/50 to-pink-50/50 border-purple-100'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <div className={`p-2 rounded-lg ${
                    isDark ? 'bg-purple-500/20' : 'bg-purple-100'
                  }`}>
                    <MessageCircle className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
                  </div>
                  <h2 className={`text-base font-semibold ${
                    isDark ? 'text-gray-100' : 'text-gray-800'
                  }`}>About</h2>
                </div>
                <p className={`leading-relaxed text-sm sm:text-base ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {creator.bio}
                </p>
              </div>
            )}

            {/* Stats Grid - Modern Cards */}
            <div className="grid mt-5 grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5 mb-8">
              {/* Followers */}
              <div className={`group p-5 rounded-2xl backdrop-blur-sm border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800/70' 
                  : 'bg-white/70 border-purple-100 hover:bg-white/90'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-all duration-300 group-hover:scale-110 ${
                  isDark ? 'bg-purple-500/20' : 'bg-purple-100'
                }`}>
                  <Users className={`w-6 h-6 ${isDark ? 'text-purple-400' : 'text-purple-600'}`} />
                </div>
                <p className={`text-2xl font-bold mb-1 ${
                  isDark ? 'text-gray-100' : 'text-gray-800'
                }`}>
                  {formatNumber(creator.totalFollowers || 0)}
                </p>
                <p className={`text-xs font-medium uppercase tracking-wide ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>Total Followers</p>
              </div>

              {/* Engagement */}
              <div className={`group p-5 rounded-2xl backdrop-blur-sm border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800/70' 
                  : 'bg-white/70 border-purple-100 hover:bg-white/90'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-all duration-300 group-hover:scale-110 ${
                  isDark ? 'bg-pink-500/20' : 'bg-pink-100'
                }`}>
                  <Heart className={`w-6 h-6 ${isDark ? 'text-pink-400' : 'text-pink-600'}`} />
                </div>
                <p className={`text-2xl font-bold mb-1 ${
                  isDark ? 'text-gray-100' : 'text-gray-800'
                }`}>
                  {engagementRate}%
                </p>
                <p className={`text-xs font-medium uppercase tracking-wide ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>Engagement Rate</p>
              </div>

              {/* Completed Deals */}
              <div className={`group p-5 rounded-2xl backdrop-blur-sm border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800/70' 
                  : 'bg-white/70 border-purple-100 hover:bg-white/90'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-all duration-300 group-hover:scale-110 ${
                  isDark ? 'bg-green-500/20' : 'bg-green-100'
                }`}>
                  <CheckCircle className={`w-6 h-6 ${isDark ? 'text-green-400' : 'text-green-600'}`} />
                </div>
                <p className={`text-2xl font-bold mb-1 ${
                  isDark ? 'text-gray-100' : 'text-gray-800'
                }`}>
                  {completedDealsCount}
                </p>
                <p className={`text-xs font-medium uppercase tracking-wide ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>Completed Deals</p>
              </div>

              {/* Response Rate */}
              <div className={`group p-5 rounded-2xl backdrop-blur-sm border shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${
                isDark 
                  ? 'bg-gray-800/50 border-gray-700 hover:bg-gray-800/70' 
                  : 'bg-white/70 border-purple-100 hover:bg-white/90'
              }`}>
                <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 transition-all duration-300 group-hover:scale-110 ${
                  isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'
                }`}>
                  <Zap className={`w-6 h-6 ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`} />
                </div>
                <p className={`text-2xl font-bold mb-1 ${
                  isDark ? 'text-gray-100' : 'text-gray-800'
                }`}>
                  {creator.stats?.responseRate || '85'}%
                </p>
                <p className={`text-xs font-medium uppercase tracking-wide ${
                  isDark ? 'text-gray-400' : 'text-gray-500'
                }`}>Response Rate</p>
              </div>
            </div>

            {/* Niches & Socials Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
              {/* Niches */}
              {creator.niches && creator.niches.length > 0 && (
                <div className={`p-5 rounded-2xl backdrop-blur-sm border shadow-lg ${
                  isDark 
                    ? 'bg-gray-800/50 border-gray-700' 
                    : 'bg-white/70 border-purple-100'
                }`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`p-2 rounded-lg ${
                      isDark ? 'bg-purple-500/20' : 'bg-purple-100'
                    }`}>
                      <Target className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
                    </div>
                    <h3 className={`text-base font-semibold ${
                      isDark ? 'text-gray-100' : 'text-gray-800'
                    }`}>Niches & Categories</h3>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {creator.niches.map((niche, index) => (
                      <span 
                        key={index}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border backdrop-blur-sm transition-all duration-300 hover:scale-105 ${
                          isDark 
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/30 hover:bg-purple-500/30' 
                            : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100'
                        }`}
                      >
                        {niche}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Platform Links */}
              {(creator.instagram || creator.youtube || creator.twitter) && (
                <div className={`p-5 rounded-2xl backdrop-blur-sm border shadow-lg ${
                  isDark 
                    ? 'bg-gray-800/50 border-gray-700' 
                    : 'bg-white/70 border-purple-100'
                }`}>
                  <div className="flex items-center gap-2 mb-4">
                    <div className={`p-2 rounded-lg ${
                      isDark ? 'bg-purple-500/20' : 'bg-purple-100'
                    }`}>
                      <Globe className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
                    </div>
                    <h3 className={`text-base font-semibold ${
                      isDark ? 'text-gray-100' : 'text-gray-800'
                    }`}>Social Platforms</h3>
                  </div>
                  <div className="space-y-2">
                    {creator.instagram && (
                      <a 
                        href={`https://instagram.com/${creator.instagram}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                          isDark 
                            ? 'bg-gray-700/50 hover:bg-gray-700/70 text-gray-300' 
                            : 'bg-purple-50/50 hover:bg-purple-100/50 text-gray-700'
                        }`}
                      >
                        <div className="p-1.5 rounded-lg bg-pink-500/20">
                          <Instagram className="w-5 h-5 text-pink-500" />
                        </div>
                        <span className="text-sm font-medium">@{creator.instagram}</span>
                        <div className="ml-auto">
                          <svg className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </a>
                    )}
                    {creator.youtube && (
                      <a 
                        href={`https://youtube.com/${creator.youtube}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                          isDark 
                            ? 'bg-gray-700/50 hover:bg-gray-700/70 text-gray-300' 
                            : 'bg-purple-50/50 hover:bg-purple-100/50 text-gray-700'
                        }`}
                      >
                        <div className="p-1.5 rounded-lg bg-red-500/20">
                          <Youtube className="w-5 h-5 text-red-500" />
                        </div>
                        <span className="text-sm font-medium">{creator.youtube}</span>
                        <div className="ml-auto">
                          <svg className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </a>
                    )}
                    {creator.twitter && (
                      <a 
                        href={`https://twitter.com/${creator.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                          isDark 
                            ? 'bg-gray-700/50 hover:bg-gray-700/70 text-gray-300' 
                            : 'bg-purple-50/50 hover:bg-purple-100/50 text-gray-700'
                        }`}
                      >
                        <div className="p-1.5 rounded-lg bg-blue-500/20">
                          <Twitter className="w-5 h-5 text-blue-500" />
                        </div>
                        <span className="text-sm font-medium">@{creator.twitter}</span>
                        <div className="ml-auto">
                          <svg className={`w-4 h-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </div>
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Trust Badges */}
            <div className={`p-5 rounded-2xl backdrop-blur-sm border shadow-lg ${
              isDark 
                ? 'bg-gradient-to-r from-gray-800/50 to-gray-800/30 border-gray-700' 
                : 'bg-gradient-to-r from-purple-50/50 to-pink-50/50 border-purple-100'
            }`}>
              <div className="flex items-center gap-2 mb-4">
                <div className={`p-2 rounded-lg ${
                  isDark ? 'bg-purple-500/20' : 'bg-purple-100'
                }`}>
                  <Shield className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
                </div>
                <h3 className={`text-base font-semibold ${
                  isDark ? 'text-gray-100' : 'text-gray-800'
                }`}>Trust & Verification</h3>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`flex items-center gap-2.5 p-3 rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                  isDark 
                    ? 'bg-gray-700/30 hover:bg-gray-700/50' 
                    : 'bg-white/50 hover:bg-white/70'
                }`}>
                  <CheckCircle className={`w-5 h-5 ${isDark ? 'text-green-400' : 'text-green-500'}`} />
                  <span className={`text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>Identity Verified</span>
                </div>
                <div className={`flex items-center gap-2.5 p-3 rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                  isDark 
                    ? 'bg-gray-700/30 hover:bg-gray-700/50' 
                    : 'bg-white/50 hover:bg-white/70'
                }`}>
                  <Award className={`w-5 h-5 ${isDark ? 'text-yellow-400' : 'text-yellow-500'}`} />
                  <span className={`text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>Top Rated Creator</span>
                </div>
                <div className={`flex items-center gap-2.5 p-3 rounded-xl transition-all duration-300 hover:scale-[1.02] ${
                  isDark 
                    ? 'bg-gray-700/30 hover:bg-gray-700/50' 
                    : 'bg-white/50 hover:bg-white/70'
                }`}>
                  <TrendingUp className={`w-5 h-5 ${isDark ? 'text-purple-400' : 'text-purple-500'}`} />
                  <span className={`text-sm font-medium ${
                    isDark ? 'text-gray-300' : 'text-gray-700'
                  }`}>Fast Response Time</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorProfile;