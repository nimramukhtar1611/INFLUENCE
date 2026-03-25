import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { User, Instagram, Youtube, Twitter, Star, Users, Heart, ArrowLeft } from 'lucide-react';
import brandService from '../../services/brandService';
import { formatNumber } from '../../utils/helpers';
import Button from '../../components/UI/Button';
import Loader from '../../components/Common/Loader';
import toast from 'react-hot-toast';

const CreatorProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <button onClick={() => navigate(-1)} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
        <ArrowLeft className="w-4 h-4 mr-1" /> Back
      </button>

      <div className="bg-white rounded-xl shadow-sm p-8">
        <div className="flex items-center gap-6 mb-6">
          {creator.profilePicture ? (
            <img src={creator.profilePicture} alt={creator.displayName} className="w-24 h-24 rounded-full object-cover" />
          ) : (
            <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center">
              <User className="w-12 h-12 text-indigo-600" />
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{creator.displayName}</h1>
            <p className="text-gray-500">@{creator.handle}</p>
            <div className="flex items-center mt-2">
              <Star className="w-4 h-4 text-yellow-400 fill-current" />
              <span className="ml-1 text-gray-700">{creator.stats?.averageRating?.toFixed(1) || '0.0'}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <Users className="w-6 h-6 text-indigo-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{formatNumber(creator.totalFollowers || 0)}</p>
            <p className="text-sm text-gray-600">Followers</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <Heart className="w-6 h-6 text-green-600 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{creator.averageEngagement?.toFixed(1) || '0'}%</p>
            <p className="text-sm text-gray-600">Engagement</p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg text-center">
            <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900">{creator.stats?.completedCampaigns || 0}</p>
            <p className="text-sm text-gray-600">Completed Deals</p>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Bio</h2>
          <p className="text-gray-700">{creator.bio || 'No bio provided.'}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Niches</h2>
          <div className="flex flex-wrap gap-2">
            {creator.niches?.map(niche => (
              <span key={niche} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">{niche}</span>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <Button variant="primary" onClick={() => navigate (`/brand/createdeal?creator=${creator._id}`)}>
            Send Offer
          </Button>
          <Button variant="outline" onClick={() => navigate('/brand/search')}>
            Back to Search
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreatorProfile;