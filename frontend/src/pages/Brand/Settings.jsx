// pages/Brand/Settings.js - COMPLETE FIXED VERSION
import React, { useState, useEffect } from 'react';
import {
  User, Bell, Shield, Eye, Lock, Globe, Save, Loader, ChevronRight,
  Mail, Phone, MapPin, Building2, Instagram, Youtube, Twitter, Facebook, Linkedin,
  AlertCircle, CheckCircle, XCircle, DollarSign, CreditCard, Wallet,
  Key, Smartphone, Monitor, Moon, Sun, Languages, Clock, RefreshCw,
  Trash2, Edit, Plus, Download, Upload, HelpCircle, FileText, Settings as SettingsIcon
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import brandService from '../../services/brandService';
import api from '../../services/api';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';

// ==================== SUB-COMPONENTS ====================

const ProfileSettings = ({ settings, setSettings }) => (
  <div className="space-y-6">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Input
        label="Brand Name *"
        value={settings.brandName || ''}
        onChange={(e) => setSettings({ ...settings, brandName: e.target.value })}
        placeholder="Your brand name"
      />
      <Input
        label="Email"
        type="email"
        value={settings.email || ''}
        disabled
        icon={Mail}
      />
      <Input
        label="Phone"
        value={settings.phone || ''}
        onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
        icon={Phone}
      />
      <Input
        label="Website (https://...)"
        value={settings.website || ''}
        onChange={(e) => setSettings({ ...settings, website: e.target.value })}
        icon={Globe}
        placeholder="https://www.yourbrand.com"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Industry *
        </label>
        <select
          value={settings.industry || 'Other'}
          onChange={(e) => setSettings({ ...settings, industry: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
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
        label="Founded Year (YYYY)"
        value={settings.founded || ''}
        onChange={(e) => setSettings({ ...settings, founded: e.target.value })}
        placeholder="e.g., 2020"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Employees
        </label>
        <select
          value={settings.employees || '1-10'}
          onChange={(e) => setSettings({ ...settings, employees: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          <option value="1-10">1-10</option>
          <option value="11-50">11-50</option>
          <option value="51-200">51-200</option>
          <option value="201-500">201-500</option>
          <option value="500+">500+</option>
        </select>
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Description
      </label>
      <textarea
        rows="4"
        value={settings.description || ''}
        onChange={(e) => setSettings({ ...settings, description: e.target.value })}
        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        placeholder="Tell creators about your brand..."
      />
    </div>
  </div>
);

const CompanySettings = ({ settings, setSettings }) => {
  const updateAddress = (field, value) =>
    setSettings({ ...settings, address: { ...settings.address, [field]: value } });

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">Address</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Street"
          value={settings.address?.street || ''}
          onChange={(e) => updateAddress('street', e.target.value)}
        />
        <Input
          label="City"
          value={settings.address?.city || ''}
          onChange={(e) => updateAddress('city', e.target.value)}
        />
        <Input
          label="State"
          value={settings.address?.state || ''}
          onChange={(e) => updateAddress('state', e.target.value)}
        />
        <Input
          label="Country"
          value={settings.address?.country || ''}
          onChange={(e) => updateAddress('country', e.target.value)}
        />
        <Input
          label="ZIP Code"
          value={settings.address?.zipCode || ''}
          onChange={(e) => updateAddress('zipCode', e.target.value)}
        />
      </div>

      <h3 className="text-lg font-medium text-gray-900 mt-6">Tax Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Tax ID / EIN"
          value={settings.taxId || ''}
          onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Business Type
          </label>
          <select
            value={settings.businessType || 'individual'}
            onChange={(e) => setSettings({ ...settings, businessType: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="individual">Individual</option>
            <option value="sole_proprietor">Sole Proprietor</option>
            <option value="llc">LLC</option>
            <option value="corporation">Corporation</option>
            <option value="non_profit">Non-Profit</option>
          </select>
        </div>
      </div>
    </div>
  );
};

const SocialSettings = ({ settings, setSettings }) => {
  const updateSocial = (platform, value) =>
    setSettings({ ...settings, socialMedia: { ...settings.socialMedia, [platform]: value } });

  return (
    <div className="space-y-6">
      <Input
        label="Instagram URL"
        value={settings.socialMedia?.instagram || ''}
        onChange={(e) => updateSocial('instagram', e.target.value)}
        icon={Instagram}
        placeholder="https://instagram.com/yourbrand"
      />
      <Input
        label="Twitter URL"
        value={settings.socialMedia?.twitter || ''}
        onChange={(e) => updateSocial('twitter', e.target.value)}
        icon={Twitter}
        placeholder="https://twitter.com/yourbrand"
      />
      <Input
        label="Facebook URL"
        value={settings.socialMedia?.facebook || ''}
        onChange={(e) => updateSocial('facebook', e.target.value)}
        icon={Facebook}
        placeholder="https://facebook.com/yourbrand"
      />
      <Input
        label="LinkedIn URL"
        value={settings.socialMedia?.linkedin || ''}
        onChange={(e) => updateSocial('linkedin', e.target.value)}
        icon={Linkedin}
        placeholder="https://linkedin.com/company/yourbrand"
      />
      <Input
        label="YouTube URL"
        value={settings.socialMedia?.youtube || ''}
        onChange={(e) => updateSocial('youtube', e.target.value)}
        icon={Youtube}
        placeholder="https://youtube.com/@yourbrand"
      />
    </div>
  );
};

// ==================== MAIN COMPONENT ====================
const BrandSettings = () => {
  const { user, refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');

  // Modal states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Database mapped state
  const [settings, setSettings] = useState({
    brandName: '',
    industry: 'Other',
    website: '',
    description: '',
    founded: '',
    employees: '1-10',
    email: '',
    phone: '',
    taxId: '',
    businessType: 'individual',
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
    }
  });

  const tabs = [
    { id: 'profile', label: 'Profile Info', icon: User },
    { id: 'company', label: 'Company Details', icon: Building2 },
    { id: 'social', label: 'Social Media', icon: Instagram },
    { id: 'security', label: 'Security', icon: Lock }
  ];

  // ==================== FETCH FROM DATABASE ====================
  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const res = await brandService.getProfile();
        if (res?.success) {
          const brand = res.brand || res;
          setSettings({
            brandName: brand.brandName || user?.brandName || '',
            industry: brand.industry || 'Other',
            website: brand.website || '',
            description: brand.description || '',
            email: brand.email || user?.email || '',
            phone: brand.phone || user?.phone || '',
            founded: brand.founded || '',
            employees: brand.employees || '1-10',
            taxId: brand.taxId || '',
            businessType: brand.businessType || 'individual',
            address: brand.address || {
              street: '', city: '', state: '', country: '', zipCode: ''
            },
            socialMedia: brand.socialMedia || {
              instagram: '', twitter: '', facebook: '', linkedin: '', youtube: ''
            }
          });
        }
      } catch (error) {
        console.error('Fetch Profile Error:', error);
        toast.error('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [user]);

  // ==================== SAVE TO DATABASE (CLEAN) ====================
  const handleSaveSettings = async () => {
    try {
      setSaving(true);

      // Create a clean copy of settings
      const payload = { ...settings };

      // Basic validations
      if (!payload.brandName) {
        toast.error('Brand Name is required');
        setSaving(false);
        return;
      }

      // Remove empty strings to avoid backend validation errors
      if (!payload.website || payload.website.trim() === '') delete payload.website;
      if (!payload.founded || payload.founded.trim() === '') delete payload.founded;
      if (!payload.taxId || payload.taxId.trim() === '') delete payload.taxId;
      if (!payload.phone || payload.phone.trim() === '') delete payload.phone;

      // Clean social media empty strings
      if (payload.socialMedia) {
        const cleanedSocial = {};
        Object.keys(payload.socialMedia).forEach(key => {
          if (payload.socialMedia[key] && payload.socialMedia[key].trim() !== '') {
            cleanedSocial[key] = payload.socialMedia[key];
          }
        });
        payload.socialMedia = cleanedSocial;
      }

      // Clean address empty strings
      if (payload.address) {
        const cleanedAddress = {};
        Object.keys(payload.address).forEach(key => {
          if (payload.address[key] && payload.address[key].trim() !== '') {
            cleanedAddress[key] = payload.address[key];
          }
        });
        payload.address = cleanedAddress;
      }

      console.log('Sending clean payload to backend:', payload);

      const res = await brandService.updateProfile(payload);

      if (res?.success) {
        toast.success('Settings updated in database successfully!');
        if (refreshUser) await refreshUser(); // sync user context
      } else {
        toast.error(res?.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Backend Response Error:', error.response?.data);

      // Extract exact validation error from backend
      let errorMessage = 'Server error while saving settings';
      if (error.response?.data?.errors && error.response.data.errors.length > 0) {
        errorMessage = error.response.data.errors[0].message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }

      toast.error(`Error: ${errorMessage}`);
    } finally {
      setSaving(false);
    }
  };

  // ==================== CHANGE PASSWORD ====================
  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordData.newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    try {
      const res = await api.post('/auth/change-password', {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      if (res.data?.success) {
        toast.success('Password changed successfully');
        setShowPasswordModal(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(res.data?.error || 'Failed to change password');
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to change password');
    }
  };

  // ==================== RENDER TAB CONTENT ====================
  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings settings={settings} setSettings={setSettings} />;
      case 'company':
        return <CompanySettings settings={settings} setSettings={setSettings} />;
      case 'social':
        return <SocialSettings settings={settings} setSettings={setSettings} />;
      case 'security':
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
              <div>
                <h4 className="font-medium text-gray-900">Password</h4>
                <p className="text-sm text-gray-500">Update your account password</p>
              </div>
              <Button variant="outline" onClick={() => setShowPasswordModal(true)}>
                Change Password
              </Button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader className="animate-spin text-indigo-600 w-10 h-10" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600">Manage your real brand profile and preferences</p>
        </div>
        <Button
          variant="primary"
          icon={Save}
          onClick={handleSaveSettings}
          loading={saving}
        >
          Save Changes
        </Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Sidebar */}
        <div className="md:w-64 border-r border-gray-200 bg-gray-50 p-4 space-y-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-600'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" />
                  {tab.label}
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 capitalize">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h2>
          {renderTabContent()}
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal
        isOpen={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        title="Change Password"
      >
        <div className="space-y-4">
          <Input
            type="password"
            label="Current Password"
            value={passwordData.currentPassword}
            onChange={(e) =>
              setPasswordData({ ...passwordData, currentPassword: e.target.value })
            }
          />
          <Input
            type="password"
            label="New Password"
            value={passwordData.newPassword}
            onChange={(e) =>
              setPasswordData({ ...passwordData, newPassword: e.target.value })
            }
          />
          <Input
            type="password"
            label="Confirm New Password"
            value={passwordData.confirmPassword}
            onChange={(e) =>
              setPasswordData({ ...passwordData, confirmPassword: e.target.value })
            }
          />
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              Password must be at least 8 characters and include uppercase, lowercase, and numbers.
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowPasswordModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleChangePassword}>
            Update Password
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default BrandSettings;