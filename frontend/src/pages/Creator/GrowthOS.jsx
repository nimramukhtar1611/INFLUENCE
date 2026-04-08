import React, { useEffect, useState, useRef } from 'react';
import { Lightbulb, RefreshCw, Clock3, Sparkles, Users, Loader, AlertCircle } from 'lucide-react';
import creatorService from '../../services/creatorService';
import Button from '../../components/UI/Button';
import toast from 'react-hot-toast';
import { useTheme } from '../../hooks/useTheme';

const CreatorGrowthOS = () => {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ideasLoading, setIdeasLoading] = useState(false);
  const [ideasRefreshLoading, setIdeasRefreshLoading] = useState(false);
  const [growthOS, setGrowthOS] = useState(null);
  const [contentType, setContentType] = useState('general');
  const [error, setError] = useState('');
  const fetchedRef = useRef(false);

  const fetchGrowthOS = async (showToast = false, options = {}) => {
    const ideasOnly = Boolean(options.onlyIdeas);
    const refreshingIdeas = Boolean(options.refreshIdeas);

    try {
      if (ideasOnly) {
        if (refreshingIdeas) {
          setIdeasRefreshLoading(true);
        } else {
          setIdeasLoading(true);
        }
      } else if (showToast) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError('');
      const params = {
        contentType: options.contentType || contentType,
      };
      if (refreshingIdeas) {
        params.refreshToken = `${Date.now()}`;
      }

      const response = await creatorService.getGrowthOS(params);

      if (response?.success) {
        setGrowthOS(response.growthOS || null);
        setContentType(response.growthOS?.selectedContentType || params.contentType || 'general');
        if (showToast && !ideasOnly) toast.success('Growth OS refreshed');
      } else {
        setError(response?.error || 'Failed to load growth suggestions');
        if (!ideasOnly) setGrowthOS(null);
      }
    } catch (err) {
      console.error('Growth OS page fetch error:', err);
      setError('Failed to load growth suggestions');
      if (!ideasOnly) setGrowthOS(null);
    } finally {
      if (ideasOnly) {
        setIdeasRefreshLoading(false);
        setIdeasLoading(false);
      } else if (showToast) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!fetchedRef.current) {
      fetchGrowthOS();
      fetchedRef.current = true;
    }
  }, []);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-gray-900' : 'bg-slate-100'}`}>
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className={isDark ? 'text-gray-300' : 'text-gray-600'}>Loading Creator Growth OS...</p>
        </div>
      </div>
    );
  }

  const postingInsights = growthOS?.postingInsights || [];
  const contentIdeas = growthOS?.contentIdeas || [];
  const audienceTips = growthOS?.audienceImprovementTips || [];
  const contentTypeOptions = growthOS?.availableContentTypes || [
    { value: 'general', label: 'General' },
    { value: 'fashion', label: 'Fashion' },
    { value: 'beauty', label: 'Beauty' },
    { value: 'technology', label: 'Technology' },
    { value: 'food & beverage', label: 'Food & Beverage' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'travel', label: 'Travel' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'lifestyle', label: 'Lifestyle' },
    { value: 'parenting', label: 'Parenting' },
    { value: 'finance', label: 'Finance' },
    { value: 'education', label: 'Education' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'sports', label: 'Sports' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'real estate', label: 'Real Estate' },
    { value: 'health', label: 'Health' },
    { value: 'wellness', label: 'Wellness' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <div className={`min-h-screen ${isDark ? 'bg-gray-900' : 'bg-slate-100'}`}>
      <div className={`sticky top-0 z-10 ${isDark ? 'bg-gray-900 border-b border-gray-800' : 'bg-white border-b border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-6 h-6 text-amber-500" />
                <h1 className={`text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Creator Growth OS</h1>
              </div>
              <p className={`mt-1 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>Platform-specific suggestions for posting times, ideas, and audience quality growth.</p>
            </div>

            <Button
              variant="outline"
              size="sm"
              icon={RefreshCw}
              loading={refreshing}
              onClick={() => fetchGrowthOS(true)}
            >
              Refresh
            </Button>
          </div>

          {error && (
            <div className={`mt-4 rounded-lg p-4 flex items-center gap-3 border ${
              isDark ? 'bg-red-950/40 border-red-900' : 'bg-red-50 border-red-200'
            }`}>
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
              <p className={isDark ? 'text-red-300' : 'text-red-700'}>{error}</p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className={`rounded-xl shadow-sm p-6 border ${
          isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
        }`}>
          <div className="flex items-center gap-2 mb-4">
            <Clock3 className="w-5 h-5 text-indigo-600" />
            <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Best Posting Time</h2>
          </div>

          {postingInsights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {postingInsights.map((insight) => (
                <div
                  key={insight.platform}
                  className={`border rounded-xl p-4 transition-colors ${
                    isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <p className={`text-sm font-semibold capitalize ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{insight.platform}</p>
                    <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                      isDark ? 'bg-indigo-950 text-indigo-300' : 'bg-indigo-100 text-indigo-700'
                    }`}>
                      {insight.confidence} confidence
                    </span>
                  </div>
                  <div className="space-y-2">
                    {(insight.windows || []).map((window) => (
                      <div
                        key={`${insight.platform}-${window.label}`}
                        className={`p-2 rounded-lg border ${
                          isDark ? 'bg-gray-900 border-gray-700' : 'bg-white border-gray-100'
                        }`}
                      >
                        <p className={`text-sm font-medium ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>{window.label}</p>
                        <p className={`text-xs ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>{window.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No posting-time insight available yet.</p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className={`rounded-xl shadow-sm p-6 border ${
            isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
          }`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-fuchsia-600" />
                <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Content Ideas</h2>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <select
                  value={contentType}
                  onChange={(e) => setContentType(e.target.value)}
                  className={`px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    isDark
                      ? 'bg-gray-800 border-gray-700 text-gray-100'
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                >
                  {contentTypeOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchGrowthOS(false, { onlyIdeas: true, contentType })}
                  loading={ideasLoading}
                >
                  Give Ideas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={RefreshCw}
                  onClick={() => fetchGrowthOS(false, { onlyIdeas: true, contentType, refreshIdeas: true })}
                  loading={ideasRefreshLoading}
                >
                  Refresh
                </Button>
              </div>
            </div>
            {contentIdeas.length > 0 ? (
              <div className="space-y-3">
                {contentIdeas.map((idea) => (
                  <div
                    key={idea}
                    className={`p-3 rounded-lg border text-sm ${
                      isDark
                        ? 'bg-fuchsia-950/35 border-fuchsia-900 text-fuchsia-100'
                        : 'bg-fuchsia-50 border-fuchsia-100 text-gray-800'
                    }`}
                  >
                    {idea}
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No content ideas available yet.</p>
            )}
          </div>

          <div className={`rounded-xl shadow-sm p-6 border ${
            isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'
          }`}>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-emerald-600" />
              <h2 className={`text-lg font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>Audience Improvement Tips</h2>
            </div>
            {audienceTips.length > 0 ? (
              <div className="space-y-3">
                {audienceTips.map((tip) => (
                  <div
                    key={tip}
                    className={`p-3 rounded-lg border text-sm ${
                      isDark
                        ? 'bg-emerald-950/35 border-emerald-900 text-emerald-100'
                        : 'bg-emerald-50 border-emerald-100 text-gray-800'
                    }`}
                  >
                    {tip}
                  </div>
                ))}
              </div>
            ) : (
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>No audience tips available yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorGrowthOS;