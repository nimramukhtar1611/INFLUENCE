// pages/Brand/Profile.js - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import { 
  Building2, Globe, Mail, Phone, MapPin, Users,
  Edit2, Camera, Save, X, Calendar, DollarSign,
  TrendingUp, Award, Star, CheckCircle, Loader,
  Instagram, Twitter, Facebook, Linkedin, Youtube,
  AlertCircle, Check
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useBrandData } from '../../hooks/useBrandData';
import brandService from '../../services/brandService';
import Input from '../../components/UI/Input';
import Button from '../../components/UI/Button';
import Modal from '../../components/Common/Modal';
import { formatCurrency, formatDate } from '../../utils/helpers';
import toast from 'react-hot-toast';

const toSocialUrl = (platform, value) => {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const clean = trimmed.replace(/^@+/, '');
  const map = {
    instagram: `https://instagram.com/${clean}`,
    twitter: `https://x.com/${clean}`,
    facebook: `https://facebook.com/${clean}`,
    linkedin: `https://linkedin.com/in/${clean}`,
    youtube: `https://youtube.com/@${clean}`
  };

  return map[platform] || trimmed;
};

const BrandProfile = () => {
  const { user } = useAuth();
  const { profile: profileFromHook, loading: hookLoading, refreshData } = useBrandData();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [formData, setFormData] = useState({
    brandName: '',
    industry: 'Other',
    website: '',
    email: '',
    phone: '',
    description: '',
    founded: '',
    companySize: '',
    businessType: 'individual',
    taxId: '',
    logo: '',
    coverImage: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    },
    socialMedia: {
      instagram: '',
      twitter: '',
      facebook: '',
      linkedin: '',
      youtube: ''
    },
    preferences: {
      preferredNiches: [],
      preferredPlatforms: [],
      minFollowers: '',
      maxFollowers: '',
      minEngagement: ''
    }
  });

  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalSpent: 0,
    totalCreators: 0,
    averageRating: 0,
    completedDeals: 0,
    joinedDate: null
  });

  // Update local state when hook data loads
  useEffect(() => {
    if (profileFromHook) {
      setProfile(profileFromHook);
      
      setFormData({
        brandName: profileFromHook.brandName || user?.brandName || '',
        industry: profileFromHook.industry || 'Other',
        website: profileFromHook.website || '',
        email: profileFromHook.email || user?.email || '',
        phone: profileFromHook.phone || user?.phone || '',
        description: profileFromHook.description || '',
        founded: profileFromHook.founded || '',
        companySize: profileFromHook.companySize || '',
        businessType: profileFromHook.businessType || 'individual',
        taxId: profileFromHook.taxId || '',
        logo: profileFromHook.logo || '',
        coverImage: profileFromHook.coverImage || '',
        address: profileFromHook.address || {
          street: '', city: '', state: '', country: '', zipCode: ''
        },
        socialMedia: profileFromHook.socialMedia || {
          instagram: toSocialUrl('instagram', profileFromHook.socialMedia?.instagram || ''),
          twitter: toSocialUrl('twitter', profileFromHook.socialMedia?.twitter || ''),
          facebook: toSocialUrl('facebook', profileFromHook.socialMedia?.facebook || ''),
          linkedin: toSocialUrl('linkedin', profileFromHook.socialMedia?.linkedin || ''),
          youtube: toSocialUrl('youtube', profileFromHook.socialMedia?.youtube || '')
        },
        preferences: profileFromHook.preferences || {
          preferredNiches: [], preferredPlatforms: [], minFollowers: '', maxFollowers: '', minEngagement: ''
        }
      });

      setStats({
        totalCampaigns: profileFromHook.stats?.totalCampaigns || 0,
        activeCampaigns: profileFromHook.stats?.activeCampaigns || 0,
        totalSpent: profileFromHook.stats?.totalSpent || 0,
        totalCreators: profileFromHook.stats?.totalCreators || 0,
        averageRating: profileFromHook.stats?.averageRating || 0,
        completedDeals: profileFromHook.stats?.completedDeals || 0,
        joinedDate: profileFromHook.createdAt || user?.createdAt
      });
      
      setLoading(false);
    }
  }, [profileFromHook, user]);

  const handleSave = async () => {
    try {
      setSaving(true);
      
      // Validate required fields
      if (!formData.brandName?.trim()) {
        toast.error('Brand name is required');
        setSaving(false);
        return;
      }

      // Clean up the data
      const cleanData = {
        brandName: formData.brandName.trim(),
        industry: formData.industry || 'Other',
        website: formData.website?.trim() || null,
        email: formData.email?.trim() || user?.email,
        phone: formData.phone?.trim() || null,
        description: formData.description?.trim() || null,
        founded: formData.founded?.trim() || null,
        companySize: formData.companySize || null,
        businessType: formData.businessType || 'individual',
        taxId: formData.taxId?.trim() || null,
        logo: formData.logo || null,
        coverImage: formData.coverImage || null,
        address: Object.fromEntries(
          Object.entries(formData.address).filter(([_, v]) => v?.trim())
        ),
        socialMedia: Object.fromEntries(
          Object.entries(formData.socialMedia)
            .filter(([_, v]) => v?.trim())
            .map(([k, v]) => [k, v.trim()])
        )
      };

      console.log('Saving profile:', cleanData);
      
      const response = await brandService.updateProfile(cleanData);
      
      if (response?.success) {
        setShowSuccessModal(true);
        setIsEditing(false);
        refreshData(); // Refresh data from hook
        toast.success('Profile updated successfully');
      } else {
        toast.error(response?.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Save error:', error);
      toast.error(error.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSocialChange = (platform, value) => {
    setFormData(prev => ({
      ...prev,
      socialMedia: {
        ...prev.socialMedia,
        [platform]: value
      }
    }));
  };

  const handleCancel = () => {
    if (profile) {
      setFormData({
        brandName: profile.brandName || '',
        industry: profile.industry || 'Other',
        website: profile.website || '',
        email: profile.email || user?.email || '',
        phone: profile.phone || user?.phone || '',
        description: profile.description || '',
        founded: profile.founded || '',
        companySize: profile.companySize || '',
        businessType: profile.businessType || 'individual',
        taxId: profile.taxId || '',
        logo: profile.logo || '',
        coverImage: profile.coverImage || '',
        address: profile.address || {
          street: '', city: '', state: '', country: '', zipCode: ''
        },
        socialMedia: profile.socialMedia || {
          instagram: toSocialUrl('instagram', profile.socialMedia?.instagram || ''),
          twitter: toSocialUrl('twitter', profile.socialMedia?.twitter || ''),
          facebook: toSocialUrl('facebook', profile.socialMedia?.facebook || ''),
          linkedin: toSocialUrl('linkedin', profile.socialMedia?.linkedin || ''),
          youtube: toSocialUrl('youtube', profile.socialMedia?.youtube || '')
        },
        preferences: profile.preferences || {
          preferredNiches: [], preferredPlatforms: [], minFollowers: '', maxFollowers: '', minEngagement: ''
        }
      });
    }
    setIsEditing(false);
  };

  if (loading || hookLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-12 h-12 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Brand Profile</h1>
          <p className="text-gray-600">View and manage your brand information</p>
        </div>
        {!isEditing ? (
          <Button variant="outline" icon={Edit2} onClick={() => setIsEditing(true)}>
            Edit Profile
          </Button>
        ) : (
          <div className="flex gap-2">
            <Button variant="secondary" icon={X} onClick={handleCancel}>
              Cancel
            </Button>
            <Button variant="primary" icon={Save} onClick={handleSave} loading={saving}>
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {/* Cover Image */}
        <div className="h-48 bg-gradient-to-r from-indigo-600 to-purple-600 relative">
          {formData.coverImage && (
            <img 
              src={formData.coverImage} 
              alt="Cover" 
              className="w-full h-full object-cover"
            />
          )}
          {isEditing && (
            <button className="absolute bottom-4 right-4 bg-white p-2 rounded-lg shadow-md hover:bg-gray-50">
              <Camera className="w-5 h-5 text-gray-700" />
            </button>
          )}
        </div>

        {/* Profile Info */}
        <div className="px-8 pb-8">
          <div className="flex items-end -mt-12 mb-6">
            <div className="relative">
              {formData.logo ? (
                <img
                  src={formData.logo}
                  alt={formData.brandName}
                  className="w-24 h-24 rounded-xl border-4 border-white shadow-lg object-cover"
                />
              ) : (
                <div className="w-24 h-24 bg-indigo-100 rounded-xl border-4 border-white shadow-lg flex items-center justify-center">
                  <Building2 className="w-12 h-12 text-indigo-600" />
                </div>
              )}
              {isEditing && (
                <button className="absolute -bottom-2 -right-2 bg-white p-1.5 rounded-full shadow-md hover:bg-gray-50">
                  <Camera className="w-4 h-4 text-gray-700" />
                </button>
              )}
            </div>
            <div className="ml-6 mb-2 flex-1">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold text-gray-900">
                  {formData.brandName || 'Your Brand Name'}
                </h2>
                {profile?.isVerified && (
                  <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Verified Brand
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Member since {stats.joinedDate ? formatDate(stats.joinedDate) : 'N/A'}
              </p>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Total Campaigns</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalCampaigns}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Active Campaigns</p>
              <p className="text-2xl font-bold text-green-600">{stats.activeCampaigns}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Total Spent</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalSpent)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-500">Rating</p>
              <div className="flex items-center">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="text-2xl font-bold text-gray-900 ml-1">
                  {stats.averageRating?.toFixed(1) || '0.0'}
                </span>
              </div>
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column - Basic Info */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Brand Name"
                    name="brandName"
                    value={formData.brandName}
                    onChange={handleChange}
                    disabled={!isEditing}
                    icon={Building2}
                    required
                  />
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Industry
                    </label>
                    <select
                      name="industry"
                      value={formData.industry}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                    >
                      <option value="">Select Industry</option>
                      <option value="Fashion">Fashion</option>
                      <option value="Beauty">Beauty</option>
                      <option value="Technology">Technology</option>
                      <option value="Food & Beverage">Food & Beverage</option>
                      <option value="Fitness">Fitness</option>
                      <option value="Travel">Travel</option>
                      <option value="Gaming">Gaming</option>
                      <option value="Lifestyle">Lifestyle</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <Input
                    label="Website"
                    name="website"
                    value={formData.website}
                    onChange={handleChange}
                    disabled={!isEditing}
                    icon={Globe}
                  />

                  <Input
                    label="Founded"
                    name="founded"
                    value={formData.founded}
                    onChange={handleChange}
                    disabled={!isEditing}
                    icon={Calendar}
                    placeholder="YYYY"
                  />

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Company Size
                    </label>
                    <select
                      name="companySize"
                      value={formData.companySize}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                    >
                      <option value="">Select Size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="500+">500+ employees</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Business Type
                    </label>
                    <select
                      name="businessType"
                      value={formData.businessType}
                      onChange={handleChange}
                      disabled={!isEditing}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                    >
                      <option value="individual">Individual</option>
                      <option value="sole_proprietor">Sole Proprietor</option>
                      <option value="llc">LLC</option>
                      <option value="corporation">Corporation</option>
                      <option value="non_profit">Non-Profit</option>
                      <option value="partnership">Partnership</option>
                    </select>
                  </div>

                  <Input
                    label="Tax ID / EIN"
                    name="taxId"
                    value={formData.taxId}
                    onChange={handleChange}
                    disabled={!isEditing}
                    placeholder="XX-XXXXXXX"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brand Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  disabled={!isEditing}
                  rows="4"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-50"
                  placeholder="Tell creators about your brand..."
                />
              </div>

              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    disabled={!isEditing}
                    icon={Mail}
                  />
                  <Input
                    label="Phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={!isEditing}
                    icon={Phone}
                  />
                </div>
              </div>

              {/* Address */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Address</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Street"
                    name="address.street"
                    value={formData.address.street}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                  <Input
                    label="City"
                    name="address.city"
                    value={formData.address.city}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                  <Input
                    label="State"
                    name="address.state"
                    value={formData.address.state}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                  <Input
                    label="Country"
                    name="address.country"
                    value={formData.address.country}
                    onChange={handleChange}
                    disabled={!isEditing}
                    icon={MapPin}
                  />
                  <Input
                    label="ZIP Code"
                    name="address.zipCode"
                    value={formData.address.zipCode}
                    onChange={handleChange}
                    disabled={!isEditing}
                  />
                </div>
              </div>
            </div>

            {/* Right Column - Social Media & Additional Info */}
            <div className="space-y-6">
              {/* Social Media */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Instagram className="w-5 h-5 text-pink-600 flex-shrink-0" />
                    <Input
                      placeholder="@username"
                      value={formData.socialMedia.instagram}
                      onChange={(e) => handleSocialChange('instagram', e.target.value)}
                      disabled={!isEditing}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Twitter className="w-5 h-5 text-blue-400 flex-shrink-0" />
                    <Input
                      placeholder="@username"
                      value={formData.socialMedia.twitter}
                      onChange={(e) => handleSocialChange('twitter', e.target.value)}
                      disabled={!isEditing}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Facebook className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <Input
                      placeholder="pagename"
                      value={formData.socialMedia.facebook}
                      onChange={(e) => handleSocialChange('facebook', e.target.value)}
                      disabled={!isEditing}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Linkedin className="w-5 h-5 text-blue-700 flex-shrink-0" />
                    <Input
                      placeholder="company/name"
                      value={formData.socialMedia.linkedin}
                      onChange={(e) => handleSocialChange('linkedin', e.target.value)}
                      disabled={!isEditing}
                      className="flex-1"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Youtube className="w-5 h-5 text-red-600 flex-shrink-0" />
                    <Input
                      placeholder="@channel"
                      value={formData.socialMedia.youtube}
                      onChange={(e) => handleSocialChange('youtube', e.target.value)}
                      disabled={!isEditing}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Stats */}
              <div className="bg-gray-50 p-6 rounded-xl">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Performance</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Completed Deals</span>
                    <span className="font-bold text-green-600">{stats.completedDeals}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Total Creators</span>
                    <span className="font-bold text-indigo-600">{stats.totalCreators}</span>
                  </div>
                </div>
              </div>

              {/* Verification Status */}
              {profile?.isVerified ? (
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="font-medium text-green-800">Verified Brand</span>
                  </div>
                  <p className="text-sm text-green-600 mt-1">
                    Your brand has been verified.
                  </p>
                </div>
              ) : (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Verification Pending</span>
                  </div>
                  <p className="text-sm text-yellow-600 mt-1">
                    Complete your profile to get verified.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        title="Profile Updated"
      >
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Profile Updated Successfully!</h3>
          <p className="text-gray-600 mb-6">
            Your brand profile has been updated.
          </p>
          <Button
            variant="primary"
            onClick={() => setShowSuccessModal(false)}
          >
            Done
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default BrandProfile;