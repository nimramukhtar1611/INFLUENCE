// pages/Creator/Settings.jsx - COMPLETE FIXED VERSION
import React, { useState, useEffect, useRef } from 'react';
import {
  User, Instagram, Youtube, Twitter, Lock,
  ChevronRight, Save, Loader, CheckCircle, AlertTriangle,
  Phone, Mail, Calendar, X, Camera, Upload, Image as ImageIcon,
  Globe, MapPin, Link2, Smartphone, Eye, EyeOff
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import creatorService from '../../services/creatorService';
import api from '../../services/api';
import toast from 'react-hot-toast';

// ---------- Local UI Components ----------
const Input = ({ label, type = 'text', value, onChange, placeholder, icon: Icon, disabled }) => (
  <div className="mb-4">
    {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
    <div className="relative">
      {Icon && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Icon className="h-5 w-5 text-gray-400" />
        </div>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 ${
          Icon ? 'pl-10' : ''
        } ${disabled ? 'bg-gray-100 text-gray-500' : ''}`}
      />
    </div>
  </div>
);

const Button = ({ variant = 'primary', size = 'md', children, onClick, disabled, icon: Icon, loading, className = '' }) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg focus:outline-none transition-colors';
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
    secondary: 'bg-gray-200 text-gray-800 hover:bg-gray-300 disabled:bg-gray-100',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:bg-gray-100',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:bg-red-300'
  };
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base'
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseClasses} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {loading && <Loader className="w-4 h-4 mr-2 animate-spin" />}
      {Icon && !loading && <Icon className="w-4 h-4 mr-2" />}
      {children}
    </button>
  );
};

// ---------- Profile Picture Upload Component ----------
const ProfilePictureUpload = ({ currentImage, onUpload }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await api.post('/upload/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data?.success) {
        toast.success('Profile picture updated');
        onUpload(response.data.profilePicture); // URL returned from server
      } else {
        throw new Error(response.data?.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload image');
      // revert preview
      setPreview(currentImage);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-6 mb-6">
      <div className="relative">
        <img
          src={preview || 'https://via.placeholder.com/100'}
          alt="Profile"
          className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
        />
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-full">
            <Loader className="w-6 h-6 text-white animate-spin" />
          </div>
        )}
      </div>
      <div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          icon={Camera}
          onClick={() => fileInputRef.current.click()}
          disabled={uploading}
        >
          Change Photo
        </Button>
        <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF up to 5MB</p>
      </div>
    </div>
  );
};

// ---------- Profile Settings ----------
const ProfileSettings = ({ settings, setSettings, user, refreshUser }) => {
  const handleImageUpload = (newImageUrl) => {
    setSettings({ ...settings, profilePicture: newImageUrl });
    refreshUser(); // Also update user context after save
  };

  // Ensure birthday is in YYYY-MM-DD format for date input
  const birthdayValue = settings.birthday && !settings.birthday.match(/^\d{4}-\d{2}-\d{2}$/)
    ? (() => {
        const date = new Date(settings.birthday);
        if (!isNaN(date)) return date.toISOString().split('T')[0];
        return '';
      })()
    : settings.birthday || '';

  return (
    <div className="space-y-6">
      <ProfilePictureUpload
        currentImage={user?.profilePicture}
        onUpload={handleImageUpload}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Input
          label="Display Name"
          value={settings.displayName}
          onChange={(e) => setSettings({ ...settings, displayName: e.target.value })}
          placeholder="Your public name"
        />
        <Input
          label="Handle"
          value={settings.handle}
          onChange={(e) => setSettings({ ...settings, handle: e.target.value })}
          placeholder="username"
        />
        <Input
          label="Email"
          type="email"
          value={settings.email}
          onChange={(e) => setSettings({ ...settings, email: e.target.value })}
          icon={Mail}
          disabled
        />
        <Input
          label="Phone"
          value={settings.phone}
          onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
          icon={Phone}
        />
        <Input
          label="Birthday"
          type="date"
          value={birthdayValue}
          onChange={(e) => setSettings({ ...settings, birthday: e.target.value })}
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Gender</label>
          <select
            value={settings.gender}
            onChange={(e) => setSettings({ ...settings, gender: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="">Prefer not to say</option>
            <option value="female">Female</option>
            <option value="male">Male</option>
            <option value="non-binary">Non-binary</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Bio</label>
        <textarea
          rows="4"
          value={settings.bio}
          onChange={(e) => setSettings({ ...settings, bio: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
          placeholder="Tell brands about yourself..."
        />
      </div>
    </div>
  );
};

// ---------- Social Links ----------
const SocialLinksSettings = ({ settings, setSettings, onVerify }) => {
  const [verifying, setVerifying] = useState({});

  const updateSocial = (platform, field, value) => {
    setSettings({
      ...settings,
      socialMedia: {
        ...settings.socialMedia,
        [platform]: {
          ...(settings.socialMedia?.[platform] || {}),
          [field]: value
        }
      }
    });
  };

  const handleVerify = async (platform) => {
    const handle = settings.socialMedia?.[platform]?.handle;
    if (!handle) {
      toast.error(`Please enter a ${platform} handle`);
      return;
    }
    setVerifying({ ...verifying, [platform]: true });
    const result = await onVerify(platform, handle);
    if (result?.success) {
      setSettings({
        ...settings,
        socialMedia: {
          ...settings.socialMedia,
          [platform]: { ...settings.socialMedia[platform], ...result.data, verified: true }
        }
      });
      toast.success(`${platform} verified successfully`);
    } else {
      toast.error(result?.error || `Failed to verify ${platform}`);
    }
    setVerifying({ ...verifying, [platform]: false });
  };

  return (
    <div className="space-y-6">
      {['instagram', 'youtube', 'tiktok'].map((platform) => (
        <div key={platform} className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {platform === 'instagram' && <Instagram className="w-5 h-5 text-pink-600" />}
              {platform === 'youtube' && <Youtube className="w-5 h-5 text-red-600" />}
              {platform === 'tiktok' && <Twitter className="w-5 h-5 text-black" />}
              <span className="font-medium capitalize">{platform}</span>
            </div>
            {settings.socialMedia?.[platform]?.verified && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <Input
              placeholder="Username"
              value={settings.socialMedia?.[platform]?.handle || ''}
              onChange={(e) => updateSocial(platform, 'handle', e.target.value)}
            />
            <Input
              placeholder="Profile URL"
              value={settings.socialMedia?.[platform]?.url || ''}
              onChange={(e) => updateSocial(platform, 'url', e.target.value)}
            />
          </div>

          {settings.socialMedia?.[platform]?.followers !== undefined && (
            <div className="text-sm text-gray-600 flex gap-4 mt-2">
              <span>Followers: {settings.socialMedia[platform].followers.toLocaleString()}</span>
              {settings.socialMedia[platform].engagement && (
                <span>Engagement: {settings.socialMedia[platform].engagement}%</span>
              )}
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => handleVerify(platform)}
            disabled={verifying[platform]}
          >
            {verifying[platform] ? <Loader className="w-4 h-4 animate-spin mr-2" /> : null}
            {settings.socialMedia?.[platform]?.verified ? 'Re-verify' : 'Verify & Fetch Stats'}
          </Button>
        </div>
      ))}
    </div>
  );
};

// ---------- Security Settings ----------
const SecuritySettingsComp = ({
  showPasswordForm, setShowPasswordForm,
  showDeleteForm, setShowDeleteForm,
  passwordData, setPasswordData,
  deletePassword, setDeletePassword,
  handleChangePassword, handleDeleteAccount
}) => {
  return (
    <div className="space-y-6">
      {/* Password section */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium text-gray-900">Password</h4>
            <p className="text-sm text-gray-500">Update your account password</p>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowPasswordForm(!showPasswordForm)}
          >
            {showPasswordForm ? 'Cancel' : 'Change Password'}
          </Button>
        </div>

        {showPasswordForm && (
          <div className="mt-4 border-t pt-4 space-y-4">
            <Input
              type="password"
              label="Current Password"
              value={passwordData.current}
              onChange={(e) => setPasswordData({ ...passwordData, current: e.target.value })}
              placeholder="Enter current password"
            />
            <Input
              type="password"
              label="New Password"
              value={passwordData.new}
              onChange={(e) => setPasswordData({ ...passwordData, new: e.target.value })}
              placeholder="Enter new password"
            />
            <Input
              type="password"
              label="Confirm New Password"
              value={passwordData.confirm}
              onChange={(e) => setPasswordData({ ...passwordData, confirm: e.target.value })}
              placeholder="Confirm new password"
            />
            <div className="flex justify-end">
              <Button variant="primary" onClick={handleChangePassword}>
                Update Password
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 2FA section (placeholder) */}
      <div className="bg-gray-50 p-4 rounded-lg flex justify-between items-center">
        <div>
          <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
          <p className="text-sm text-gray-500">Add an extra layer of security</p>
        </div>
        <Button variant="primary" size="sm">Enable 2FA</Button>
      </div>

      {/* Delete Account section */}
      <div className="bg-red-50 p-4 rounded-lg">
        <div className="flex justify-between items-center">
          <div>
            <h4 className="font-medium text-red-900">Delete Account</h4>
            <p className="text-sm text-red-600">Permanently delete your account and all data</p>
          </div>
          <Button
            variant="danger"
            onClick={() => setShowDeleteForm(!showDeleteForm)}
          >
            {showDeleteForm ? 'Cancel' : 'Delete Account'}
          </Button>
        </div>

        {showDeleteForm && (
          <div className="mt-4 border-t border-red-200 pt-4 space-y-4">
            <div className="flex items-start gap-3 text-red-600 bg-red-100 p-4 rounded-lg">
              <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">This action is permanent!</p>
                <p className="text-red-700 mt-1">All your data will be permanently deleted and cannot be recovered.</p>
              </div>
            </div>
            <Input
              type="password"
              label="Confirm your password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your password to confirm"
            />
            <div className="flex justify-end">
              <Button variant="danger" onClick={handleDeleteAccount}>
                Yes, Delete My Account
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ---------- Main Component ----------
const CreatorSettings = () => {
  const { user, changePassword, deleteAccount, refreshUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [showDeleteForm, setShowDeleteForm] = useState(false);

  const [passwordData, setPasswordData] = useState({
    current: '',
    new: '',
    confirm: ''
  });

  const [deletePassword, setDeletePassword] = useState('');

  const [settings, setSettings] = useState({
    displayName: '',
    handle: '',
    bio: '',
    email: '',
    phone: '',
    birthday: '',
    gender: '',
    profilePicture: '',
    socialMedia: {
      instagram: { handle: '', url: '', verified: false, followers: 0, engagement: 0 },
      youtube: { handle: '', url: '', verified: false, subscribers: 0, views: 0, videos: 0 },
      tiktok: { handle: '', url: '', verified: false, followers: 0, likes: 0, videos: 0 },
      twitter: { handle: '', url: '', verified: false, followers: 0, following: 0, tweets: 0 }
    }
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'social', label: 'Social Links', icon: Instagram },
    { id: 'security', label: 'Security', icon: Lock },
  ];

  // Load user data into settings
  useEffect(() => {
    if (user) {
      // Ensure birthday is in YYYY-MM-DD format (HTML date input format)
      let formattedBirthday = user.birthday || '';
      if (formattedBirthday && !formattedBirthday.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const date = new Date(formattedBirthday);
        if (!isNaN(date)) {
          formattedBirthday = date.toISOString().split('T')[0];
        }
      }

      setSettings({
        displayName: user.displayName || '',
        handle: user.handle || '',
        bio: user.bio || '',
        email: user.email || '',
        phone: user.phone || '',
        birthday: formattedBirthday,
        gender: user.gender || '',
        profilePicture: user.profilePicture || '',
        socialMedia: user.socialMedia || {
          instagram: { handle: '', url: '', verified: false, followers: 0, engagement: 0 },
          youtube: { handle: '', url: '', verified: false, subscribers: 0, views: 0, videos: 0 },
          tiktok: { handle: '', url: '', verified: false, followers: 0, likes: 0, videos: 0 },
          twitter: { handle: '', url: '', verified: false, followers: 0, following: 0, tweets: 0 }
        }
      });
    }
  }, [user]);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const profileUpdate = {
        displayName: settings.displayName,
        handle: settings.handle,
        bio: settings.bio,
        phone: settings.phone,
        birthday: settings.birthday,
        gender: settings.gender,
        profilePicture: settings.profilePicture
      };

      const profileRes = await creatorService.updateProfile(profileUpdate);
      if (!profileRes.success) {
        throw new Error(profileRes.error || 'Failed to update profile');
      }

      // Refresh user context to sync changes from backend
      if (refreshUser) {
        await refreshUser();
      }

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Save settings error:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleVerifySocial = async (platform, handle) => {
    return await creatorService.verifySocialMedia(platform, handle);
  };

  const handleChangePassword = async () => {
    if (passwordData.new !== passwordData.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    if (passwordData.new.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    const res = await changePassword(passwordData.current, passwordData.new);
    if (res?.success) {
      setShowPasswordForm(false);
      setPasswordData({ current: '', new: '', confirm: '' });
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword) {
      toast.error('Please enter your password');
      return;
    }
    const res = await deleteAccount(deletePassword);
    if (res?.success) {
      setShowDeleteForm(false);
      setDeletePassword('');
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'profile':
        return <ProfileSettings settings={settings} setSettings={setSettings} user={user} refreshUser={refreshUser} />;
      case 'social':
        return <SocialLinksSettings settings={settings} setSettings={setSettings} onVerify={handleVerifySocial} />;
      case 'security':
        return (
          <SecuritySettingsComp
            showPasswordForm={showPasswordForm}
            setShowPasswordForm={setShowPasswordForm}
            showDeleteForm={showDeleteForm}
            setShowDeleteForm={setShowDeleteForm}
            passwordData={passwordData}
            setPasswordData={setPasswordData}
            deletePassword={deletePassword}
            setDeletePassword={setDeletePassword}
            handleChangePassword={handleChangePassword}
            handleDeleteAccount={handleDeleteAccount}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <Button variant="primary" icon={Save} onClick={handleSaveSettings} loading={saving}>
              Save Changes
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {/* Sidebar */}
            <div className="md:w-72 border-r border-gray-200 bg-gray-50">
              <nav className="p-4 space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg ${
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
              </nav>
            </div>

            {/* Content */}
            <div className="flex-1 p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6 capitalize">
                {tabs.find(t => t.id === activeTab)?.label} Settings
              </h2>
              {renderTabContent()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreatorSettings;