// pages/Brand/SearchCreators.js - FULL FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Search, SlidersHorizontal, X, Star, Instagram, Youtube, Globe, ChevronDown, Loader, User, Sparkles } from 'lucide-react';
import brandService from '../../services/brandService';
import campaignService from '../../services/campaignService';
import { formatNumber } from '../../utils/helpers';
import { useSubscription } from '../../context/SubscriptionContext';
import { useNavigate } from 'react-router-dom';

const normalizePlanId = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.trim().toLowerCase();
  if (typeof value.planId === 'string') return value.planId.trim().toLowerCase();
  if (typeof value.id === 'string') return value.id.trim().toLowerCase();
  return '';
};

const SearchCreators = () => {
  const [loading,    setLoading]    = useState(true);
  const [showFilters,setShowFilters]= useState(false);
  const [creators,   setCreators]   = useState([]);
  const [campaigns,  setCampaigns]  = useState([]);
  const [aiMatchingActive, setAiMatchingActive] = useState(false);
  const [aiMatchingCanUse, setAiMatchingCanUse] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 1 });
  const requestIdRef = useRef(0);
const navigate = useNavigate();
  const { currentSubscription } = useSubscription();

  const currentPlanId = normalizePlanId(currentSubscription?.planId || currentSubscription?.plan || currentSubscription);
  const canUseAiMatchingByPlan = ['professional', 'enterprise'].includes(currentPlanId);

  const hasPlatformAccount = (creator, platform) => {
    const social = creator?.socialMedia?.[platform];
    const explicitVerification = creator?.socialVerification?.[platform];
    if (!social) return false;

    if (explicitVerification || social?.verified) return true;

    const handle = typeof social?.handle === 'string' ? social.handle.trim() : '';
    const url = typeof social?.url === 'string' ? social.url.trim() : '';
    if (handle || url) return true;

    return [social?.followers, social?.subscribers, social?.views, social?.posts, social?.videos, social?.likes]
      .some((value) => Number(value) > 0);
  };
  // FIX 29: q: '' added to initial state
  const [filters, setFilters] = useState({
    q:             '',
    niche:         '',
    minFollowers:  '',
    maxFollowers:  '',
    minEngagement: '',
    platform:      '',
    location:      '',
    verified:      '',
    available:     '',
    sort:          'relevance',
    aiMatching:    false,
    campaignId:    ''
  });

  useEffect(() => { fetchCreators(); }, [filters, pagination.page]);
  useEffect(() => {
    if (canUseAiMatchingByPlan) {
      fetchCampaignOptions();
      return;
    }

    setCampaigns([]);
    setAiMatchingCanUse(false);
  }, [canUseAiMatchingByPlan]);

  useEffect(() => {
    if (canUseAiMatchingByPlan) return;

    setFilters((prev) => ({
      ...prev,
      aiMatching: false,
      campaignId: '',
      sort: prev.sort === 'ai_match' ? 'relevance' : prev.sort,
    }));
  }, [canUseAiMatchingByPlan]);

  const fetchCampaignOptions = async () => {
    try {
      const res = await campaignService.getBrandCampaigns('all', 1, 100);
      const list = Array.isArray(res?.campaigns) ? res.campaigns : [];
      setCampaigns(list);
    } catch (error) {
      console.error('Failed to load campaign options for AI matching:', error);
      setCampaigns([]);
    }
  };

  const fetchCreators = async () => {
    const requestId = ++requestIdRef.current;

    try {
      setLoading(true);
      const res = await brandService.searchCreators(filters, pagination.page, pagination.limit);

      if (requestId !== requestIdRef.current) return;

      if (res?.success || res?.creators) {
        setCreators(res.creators || []);
        setAiMatchingActive(Boolean(res.aiMatching));
        const entitlementCanUse = typeof res?.aiMatchingEntitlement?.canUse === 'boolean'
          ? res.aiMatchingEntitlement.canUse
          : canUseAiMatchingByPlan;
        setAiMatchingCanUse(entitlementCanUse);

        if (!entitlementCanUse && filters.aiMatching) {
          setFilters((prev) => ({
            ...prev,
            aiMatching: false,
            campaignId: '',
            sort: prev.sort === 'ai_match' ? 'relevance' : prev.sort,
          }));
        }
        setPagination(res.pagination || { page: 1, limit: 10, total: 0, pages: 1 });
      }
    } catch (e) { console.error('Search error:', e); }
    finally {
      if (requestId === requestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  // FIX 30: q: '' included in reset
  const clearFilters = () => {
    setFilters({ q: '', niche: '', minFollowers: '', maxFollowers: '', minEngagement: '', platform: '', location: '', verified: '', available: '', sort: 'relevance', aiMatching: false, campaignId: '' });
    setAiMatchingActive(false);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const niches    = ['Fashion', 'Beauty', 'Fitness', 'Travel', 'Food', 'Tech', 'Gaming', 'Lifestyle', 'Parenting', 'Finance'];
  const platforms = ['instagram', 'youtube', 'tiktok', 'twitter', 'facebook'];

  if (loading && creators.length === 0) {
    return <div className="min-h-screen flex items-center justify-center"><Loader className="w-12 h-12 animate-spin text-indigo-600" /></div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Find Creators</h1>
        <p className="text-gray-600">Discover the perfect creators for your brand</p>
      </div>

      {/* Search bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input type="text" placeholder="Search by name, niche, or location..."
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              // FIX: filters.q is now defined
              value={filters.q}
              onChange={e => handleFilterChange('q', e.target.value)} />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 border rounded-lg flex items-center gap-2 ${showFilters ? 'bg-indigo-50 border-indigo-600 text-indigo-600' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}>
            <SlidersHorizontal className="w-5 h-5" /> Filters
          </button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-gray-900">Filters</h3>
              <button onClick={() => setShowFilters(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Niche</label>
                <select value={filters.niche} onChange={e => handleFilterChange('niche', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">All Niches</option>
                  {niches.map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Platform</label>
                <select value={filters.platform} onChange={e => handleFilterChange('platform', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  <option value="">All Platforms</option>
                  {platforms.map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Followers</label>
                <input type="number" value={filters.minFollowers}
                  onChange={e => handleFilterChange('minFollowers', e.target.value)}
                  placeholder="e.g., 1000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Engagement %</label>
                <input type="number" step="0.1" value={filters.minEngagement}
                  onChange={e => handleFilterChange('minEngagement', e.target.value)}
                  placeholder="e.g., 3.5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            </div>

            {aiMatchingCanUse && (
            <div className="mt-4 p-4 rounded-lg border border-indigo-200 bg-indigo-50/60">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-indigo-900">AI Creator Matching Engine</p>
                  <p className="text-xs text-indigo-700">Behavioral + engagement + niche scoring with campaign success probability.</p>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium text-indigo-900">
                  <input
                    type="checkbox"
                    checked={Boolean(filters.aiMatching)}
                    onChange={(e) => {
                      const enabled = e.target.checked;
                      setFilters((prev) => ({
                        ...prev,
                        aiMatching: enabled,
                        sort: enabled ? 'ai_match' : 'relevance',
                        campaignId: enabled ? prev.campaignId : ''
                      }));
                      setPagination((prev) => ({ ...prev, page: 1 }));
                    }}
                    className="rounded border-indigo-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  Enable AI Matching
                </label>
              </div>

              {filters.aiMatching && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Campaign Context (optional but recommended)</label>
                  <select
                    value={filters.campaignId}
                    onChange={(e) => handleFilterChange('campaignId', e.target.value)}
                    className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    <option value="">No campaign context</option>
                    {campaigns.map((campaign) => (
                      <option key={campaign._id} value={campaign._id}>
                        {campaign.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            )}

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-200">
              <button onClick={clearFilters} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900">Clear All</button>
              <button onClick={() => setShowFilters(false)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">Apply Filters</button>
            </div>
          </div>
        )}
      </div>

      {/* Results header */}
      <div className="flex justify-between items-center">
        <p className="text-gray-600">Showing {creators.length} of {pagination.total} creators</p>
        {aiMatchingActive && (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            AI Matching Active
          </div>
        )}
   
      </div>

      {/* Creator grid */}
      {creators.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {creators.map(creator => (
            <div key={creator._id} className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  {creator.profilePicture ? (
                    <img src={creator.profilePicture} alt={creator.displayName} className="w-16 h-16 rounded-full object-cover" />
                  ) : (
                    <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
                      <User className="w-8 h-8 text-indigo-600" />
                    </div>
                  )}
                  <div className="ml-4">
                    <h3 className="font-semibold text-gray-900">{creator.displayName}</h3>
                    <p className="text-sm text-gray-500">{creator.handle}</p>
                    <div className="flex items-center mt-1">
                      <Star className="w-4 h-4 text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600 ml-1">{creator.stats?.averageRating?.toFixed(1) || '0.0'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-gray-600">{creator.niches?.join(', ') || 'No niches'}</p>
                {creator.location && <p className="text-sm text-gray-500">{creator.location}</p>}
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{formatNumber(creator.totalFollowers || 0)}</p>
                    <p className="text-xs text-gray-500">Followers</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-600">{creator.averageEngagement?.toFixed(1) || '0'}%</p>
                    <p className="text-xs text-gray-500">Engagement</p>
                  </div>
                  {creator.stats?.completedDeals > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-900">{creator.stats.completedDeals}</p>
                      <p className="text-xs text-gray-500">Deals</p>
                    </div>
                  )}
                </div>
              </div>

              {creator.aiMatch && (
                <div className="mb-4 p-3 rounded-lg border border-indigo-200 bg-indigo-50">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wide">AI Match</p>
                    <span className="text-xs font-bold text-indigo-800">{creator.aiMatch.score}%</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-indigo-800 mb-2">
                    <span>Success Probability</span>
                    <span className="font-semibold">{creator.aiMatch.successProbability}%</span>
                  </div>
                  <div className="text-[11px] text-indigo-700">
                    {(creator.aiMatch.reasons || []).slice(0, 1).join('')}
                  </div>
                </div>
              )}

              {/* Platforms */}
              <div className="flex items-center gap-2 mb-4">
                {hasPlatformAccount(creator, 'instagram') && <Instagram className="w-5 h-5 text-pink-600" />}
                {hasPlatformAccount(creator, 'youtube')   && <Youtube   className="w-5 h-5 text-red-600" />}
                {hasPlatformAccount(creator, 'tiktok')    && <Globe     className="w-5 h-5 text-black" />}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
  onClick={() => navigate (`/brand/createdeal?creator=${creator._id}`)}
  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 text-center"
>
  Send Offer
</button>
                <Link to={`/brand/creators/${creator._id}`}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 text-center">
                  View Profile
                </Link>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm">
          <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No creators found</h3>
          <p className="text-gray-500">Try adjusting your filters</p>
          <button onClick={clearFilters} className="mt-4 text-indigo-600 hover:text-indigo-700 text-sm font-medium">Clear all filters</button>
        </div>
      )}

      {/* Load more */}
      {pagination.pages > pagination.page && (
        <div className="text-center pt-4">
          <button
            onClick={() => { setLoading(true); setPagination(prev => ({ ...prev, page: prev.page + 1 })); }}
            className="px-6 py-3 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 inline-flex items-center">
            Load More <ChevronDown className="ml-2 w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SearchCreators;