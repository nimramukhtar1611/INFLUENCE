// pages/Creator/Profile.jsx - Creator Profile Page
import React, { useState, useEffect, useRef } from 'react';
import {
  User, Mail, Phone, Edit2, Camera, Save, X, Calendar,
  Instagram, Youtube, Twitter, TrendingUp, Award, Star,
  AlertCircle, CheckCircle, Loader, MapPin, Globe, Link2
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useCreatorData } from '../../hooks/useCreatorData';
import creatorService from '../../services/creatorService';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import { formatDate, formatNumber } from '../../utils/helpers';
import toast from 'react-hot-toast';

const CreatorProfile = () => {
  const { user, updateUser } = useAuth();
  const { profile: profileFromHook, loading: hookLoading, refreshData } = useCreatorData();
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    fullName: '',
    displayName: '',
    handle: '',
    bio: '',
    email: '',
    phone: '',
    profilePicture: '',
    coverPicture: '',
    niches: [],
    socialMedia: {
      instagram: '',
      youtube: '',
      tiktok: '',
      twitter: ''
    },
    location: {
      city: '',
      country: ''
    }
  });

  const [errors, setErrors] = useState({});

  // Load profile data from hook
  useEffect(() => {
    if (profileFromHook) {
      setProfile(profileFromHook);
      setFormData({
        fullName: profileFromHook.fullName || user?.fullName || '',
        displayName: profileFromHook.displayName || '',
        handle: profileFromHook.handle || '',
        bio: profileFromHook.bio || '',
        email: profileFromHook.email || user?.email || '',
        phone: profileFromHook.phone || user?.phone || '',
        profilePicture: profileFromHook.profilePicture || user?.profilePicture || '',
        coverPicture: profileFromHook.coverPicture || user?.coverPicture || '',
        niches: profileFromHook.niches || [],
        socialMedia: profileFromHook.socialMedia || {
          instagram: '',
          youtube: '',
          tiktok: '',
          twitter: ''
        },
        location: profileFromHook.location || {
          city: '',
          country: ''
        }
      });
    }
  }, [profileFromHook, user]);

  // Handle profile picture upload
  const handleProfilePictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          profilePicture: reader.result
        }));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload profile picture');
    }
  };

  // Handle cover picture upload
  const handleCoverPictureChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          coverPicture: reader.result
        }));
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast.error('Failed to upload cover picture');
    }
  };

  // Handle input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  };

  // Handle social media changes
  const handleSocialMediaChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value
      }
    }));
  };

  // Handle location changes
  const handleLocationChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      location: {
        ...prev.location,
        [field]: value
      }
    }));
  };

  // Handle niche changes
  const handleNicheChange = (e) => {
    const nicheArray = e.target.value.split(',').map(n => n.trim()).filter(n => n);
    setFormData(prev => ({
      ...prev,
      niches: nicheArray
    }));
  };

  // Validate form
  const validate = () => {
    const newErrors = {};

    if (!formData.fullName?.trim()) newErrors.fullName = 'Full name is required';
    if (!formData.displayName?.trim()) newErrors.displayName = 'Display name is required';
    if (!formData.handle?.trim()) newErrors.handle = 'Handle is required';
    if (!formData.email?.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email format';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save
  const handleSave = async () => {
    if (!validate()) return;

    setSaving(true);
    try {
      const response = await creatorService.updateProfile(formData);
      if (response?.success) {
        setProfile(response.creator || formData);
        updateUser(formData);
        setIsEditing(false);
        setShowSuccessModal(true);
        toast.success('Profile updated successfully!');
        // Refresh data from hook
        if (refreshData) {
          refreshData();
        }
      } else {
        toast.error(response?.message || response?.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update error:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (hookLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader className="w-8 h-8 animate-spin text-[#667eea]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Edit Button */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">My Profile</h1>
        {!isEditing && (
          <Button
            variant="primary"
            icon={Edit2}
            onClick={() => setIsEditing(true)}
          >
            Edit Profile
          </Button>
        )}
      </div>

      {/* Cover Picture */}
      <div className="relative h-48 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-lg overflow-hidden group">
        {formData.coverPicture && (
          <img
            src={formData.coverPicture}
            alt="Cover"
            className="w-full h-full object-cover"
          />
        )}
        {isEditing && (
          <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center cursor-pointer"
            onClick={() => {
              const event = new MouseEvent('click');
              const input = document.createElement('input');
              input.type = 'file';
              input.accept = 'image/*';
              input.addEventListener('change', handleCoverPictureChange);
              input.dispatchEvent(event);
            }}
          >
            <Camera className="w-6 h-6 text-white" />
          </div>
        )}
      </div>

      {/* Profile Picture and Basic Info */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-start gap-6 mb-6">
          {/* Profile Picture */}
          <div className="relative">
            <div className="w-24 h-24 rounded-full bg-gradient-to-r from-[#667eea]/10 to-[#764ba2]/10 flex items-center justify-center overflow-hidden border-4 border-white shadow-lg -mt-16">
              {formData.profilePicture ? (
                <img
                  src={formData.profilePicture}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              ) : (
                <User className="w-12 h-12 text-[#667eea]" />
              )}
            </div>
            {isEditing && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white p-2 rounded-full hover:from-[#5a67d8] hover:to-[#6b4c9a] transition"
              >
                <Camera className="w-4 h-4" />
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleProfilePictureChange}
            />
          </div>

          {/* Display Name and Handle */}
          {!isEditing ? (
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{formData.displayName || formData.fullName}</h2>
              <p className="text-[#667eea] font-medium">@{formData.handle}</p>
              {formData.bio && (
                <p className="text-gray-600 mt-2 max-w-2xl">{formData.bio}</p>
              )}
            </div>
          ) : (
            <div className="flex-1 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-[#667eea] focus:border-[#667eea]"
                />
                {errors.fullName && <p className="text-red-600 text-sm mt-1">{errors.fullName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
                <input
                  type="text"
                  name="displayName"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-[#667eea] focus:border-[#667eea]"
                />
                {errors.displayName && <p className="text-red-600 text-sm mt-1">{errors.displayName}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Handle</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-gray-500">@</span>
                  <input
                    type="text"
                    name="handle"
                    value={formData.handle}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 pl-7 border rounded-lg focus:ring-[#667eea] focus:border-[#667eea]"
                  />
                </div>
                {errors.handle && <p className="text-red-600 text-sm mt-1">{errors.handle}</p>}
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <>
            {/* Bio */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleInputChange}
                placeholder="Tell us about yourself..."
                rows="3"
                className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Niches */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">Niches (comma-separated)</label>
              <input
                type="text"
                value={formData.niches.join(', ')}
                onChange={handleNicheChange}
                placeholder="e.g. Tech, Lifestyle, Beauty"
                className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          </>
        )}
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </label>
            {isEditing ? (
              <>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border rounded-lg focus:ring-[#667eea] focus:border-[#667eea]"
                />
                {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
              </>
            ) : (
              <p className="text-gray-600">{formData.email}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Phone className="w-4 h-4" />
              Phone
            </label>
            {isEditing ? (
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            ) : (
              <p className="text-gray-600">{formData.phone || '—'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Location */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Location
        </h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.location.city}
                onChange={(e) => handleLocationChange('city', e.target.value)}
                placeholder="City"
                className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            ) : (
              <p className="text-gray-600">{formData.location.city || '—'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.location.country}
                onChange={(e) => handleLocationChange('country', e.target.value)}
                placeholder="Country"
                className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            ) : (
              <p className="text-gray-600">{formData.location.country || '—'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Social Media Links */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Instagram className="w-4 h-4" />
              Instagram
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.socialMedia.instagram}
                onChange={(e) => handleSocialMediaChange('instagram', e.target.value)}
                placeholder="https://instagram.com/username"
                className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            ) : (
              formData.socialMedia.instagram ? (
                <a
                  href={formData.socialMedia.instagram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  {formData.socialMedia.instagram}
                </a>
              ) : (
                <p className="text-gray-600">—</p>
              )
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Youtube className="w-4 h-4" />
              YouTube
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.socialMedia.youtube}
                onChange={(e) => handleSocialMediaChange('youtube', e.target.value)}
                placeholder="https://youtube.com/channel/..."
                className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            ) : (
              formData.socialMedia.youtube ? (
                <a
                  href={formData.socialMedia.youtube}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  {formData.socialMedia.youtube}
                </a>
              ) : (
                <p className="text-gray-600">—</p>
              )
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Twitter className="w-4 h-4" />
              Twitter
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.socialMedia.twitter}
                onChange={(e) => handleSocialMediaChange('twitter', e.target.value)}
                placeholder="https://twitter.com/username"
                className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            ) : (
              formData.socialMedia.twitter ? (
                <a
                  href={formData.socialMedia.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  {formData.socialMedia.twitter}
                </a>
              ) : (
                <p className="text-gray-600">—</p>
              )
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              TikTok
            </label>
            {isEditing ? (
              <input
                type="text"
                value={formData.socialMedia.tiktok}
                onChange={(e) => handleSocialMediaChange('tiktok', e.target.value)}
                placeholder="https://tiktok.com/@username"
                className="w-full px-4 py-2 border rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
              />
            ) : (
              formData.socialMedia.tiktok ? (
                <a
                  href={formData.socialMedia.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:text-indigo-700"
                >
                  {formData.socialMedia.tiktok}
                </a>
              ) : (
                <p className="text-gray-600">—</p>
              )
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      {isEditing && (
        <div className="flex gap-4">
          <Button
            variant="primary"
            icon={Save}
            onClick={handleSave}
            loading={saving}
            className="flex-1"
          >
            Save Changes
          </Button>
          <Button
            variant="outline"
            icon={X}
            onClick={() => setIsEditing(false)}
            disabled={saving}
            className="flex-1"
          >
            Cancel
          </Button>
        </div>
      )}

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Success"
      >
        <div className="text-center py-6">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Updated</h3>
          <p className="text-gray-600 mb-6">Your profile has been updated successfully.</p>
          <Button
            variant="primary"
            onClick={() => setShowSuccessModal(false)}
            className="w-full"
          >
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default CreatorProfile;
