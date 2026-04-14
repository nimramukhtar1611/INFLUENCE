import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const CreatorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [creator, setCreator] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchCreator = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const response = await fetch(`/api/creators/${id}`);
        const data = await response.json();

        if (data.success) {
          setCreator(data.creator);
        } else {
          setError(data.error || 'Creator not found');
        }
      } catch (err) {
        console.error('Fetch creator error:', err);
        setError('Failed to load creator profile');
      } finally {
        setLoading(false);
      }
    };

    fetchCreator();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading creator profile...</span>
      </div>
    );
  }

  if (error || !creator) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-red-600 text-lg font-medium mb-2">Error</div>
        <p className="text-gray-600 mb-4">{error || 'Creator not found'}</p>
        <button
          onClick={() => navigate('/')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-900">Creator Profile</h1>
            <button
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900 transition-colors"
            >
              ← Back to Home
            </button>
          </div>
        </div>
      </div>

      {/* Profile Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden"
        >
          {/* Profile Header */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-8">
            <div className="flex items-center gap-6">
              <img
                src={creator.profilePicture || '/default-avatar.png'}
                alt={creator.displayName}
                className="w-24 h-24 rounded-full border-4 border-white object-cover"
              />
              <div className="text-white">
                <h2 className="text-3xl font-bold mb-1">{creator.displayName}</h2>
                <p className="text-blue-100 mb-2">@{creator.handle}</p>
                <div className="flex items-center gap-4 text-sm">
                  <span>{(creator.totalFollowers || 0).toLocaleString()} followers</span>
                  <span>{(creator.averageEngagement || 0).toFixed(1)}% engagement</span>
                </div>
              </div>
            </div>
          </div>

          {/* Profile Details */}
          <div className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left Column */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">About</h3>
                {creator.bio ? (
                  <p className="text-gray-600 mb-6">{creator.bio}</p>
                ) : (
                  <p className="text-gray-400 italic mb-6">No bio available</p>
                )}

                {creator.location && (
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-500">Location:</span>
                    <p className="text-gray-900">{creator.location}</p>
                  </div>
                )}

                {creator.website && (
                  <div className="mb-4">
                    <span className="text-sm font-medium text-gray-500">Website:</span>
                    <a 
                      href={creator.website} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 block"
                    >
                      {creator.website}
                    </a>
                  </div>
                )}

                {/* Niches */}
                {creator.niches && creator.niches.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Niches</h4>
                    <div className="flex flex-wrap gap-2">
                      {creator.niches.map((niche, index) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-full"
                        >
                          {niche}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media</h3>
                {creator.socialMedia ? (
                  <div className="space-y-3">
                    {Object.entries(creator.socialMedia).map(([platform, data]) => (
                      <div key={platform} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <span className="font-medium text-gray-900 capitalize">{platform}</span>
                          {data.followers && (
                            <span className="text-sm text-gray-500 ml-2">
                              {data.followers.toLocaleString()} followers
                            </span>
                          )}
                        </div>
                        {data.verified && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                            Verified
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic">No social media accounts connected</p>
                )}

                {/* Stats */}
                {creator.stats && (
                  <div className="mt-6">
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Performance Stats</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {creator.stats.averageRating && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-semibold text-gray-900">
                            {creator.stats.averageRating.toFixed(1)}
                          </div>
                          <div className="text-xs text-gray-500">Average Rating</div>
                        </div>
                      )}
                      {creator.stats.completedCampaigns && (
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-lg font-semibold text-gray-900">
                            {creator.stats.completedCampaigns}
                          </div>
                          <div className="text-xs text-gray-500">Completed Campaigns</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <div className="flex gap-4">
                <button className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Contact Creator
                </button>
                <button className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                  View Portfolio
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CreatorProfile;
