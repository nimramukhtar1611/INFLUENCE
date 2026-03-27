import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Shield,
  Mail,
  DollarSign,
  Bell,
  Lock,
  Users,
  Settings as SettingsIcon,
  Save,
  CreditCard,
  AlertTriangle,
  RefreshCw,
  CheckCircle,
  XCircle,
  Eye,
  EyeOff,
  Moon,
  Sun,
  Camera,
  Loader,
  Smartphone,
  Monitor,
  HelpCircle
} from 'lucide-react';
import { useAdminData } from '../../hooks/useAdminData';
import { useAuth } from '../../hooks/useAuth';
import api from '../../services/api';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';

const ProfilePictureUpload = ({ currentImage, onUpload, fullName, email }) => {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(currentImage || '');
  const fileInputRef = useRef(null);

  useEffect(() => {
    setPreview(currentImage || '');
  }, [currentImage]);

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const previewReader = new FileReader();
    previewReader.onloadend = () => setPreview(previewReader.result);
    previewReader.readAsDataURL(file);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await api.post('/upload/profile-picture', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Upload failed');
      }

      const uploadedUrl = response.data.profilePicture || response.data.file?.url;
      if (!uploadedUrl) {
        throw new Error('Upload succeeded but no image URL was returned');
      }

      onUpload(uploadedUrl);
      toast.success('Profile picture updated');
    } catch (error) {
      setPreview(currentImage || '');
      toast.error(error.response?.data?.error || error.message || 'Failed to upload profile picture');
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <img
              src={preview || 'https://via.placeholder.com/96?text=Admin'}
              alt={fullName || 'Admin'}
              className="w-20 h-20 rounded-full object-cover border-2 border-white shadow"
            />
            {uploading && (
              <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center">
                <Loader className="w-5 h-5 text-white animate-spin" />
              </div>
            )}
          </div>
          <div>
            <p className="font-medium text-gray-900">{fullName || 'Admin User'}</p>
            <p className="text-sm text-gray-500">{email || 'No email available'}</p>
          </div>
        </div>

        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            icon={Camera}
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
          >
            {uploading ? 'Uploading...' : 'Change Photo'}
          </Button>
          <p className="text-xs text-gray-500 mt-2">JPG, PNG, WEBP up to 5MB.</p>
        </div>
      </div>
    </div>
  );
};

const AdminSettings = () => {
  const { user, refreshUser, updateUser } = useAuth();
  const {
    settings,
    fees,
    updateSettings,
    updateFees,
    clearCache,
    refreshData,
    get2FAStatus,
    generate2FA,
    verify2FA,
    disable2FA
  } = useAdminData();
  
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  
  // 2FA State
  const [twoFactorStatus, setTwoFactorStatus] = useState(null);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState('initial'); // initial, setup, verify, success
  const [qrCodeData, setQrCodeData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [disabling2FA, setDisabling2FA] = useState(false);
  const [profileImage, setProfileImage] = useState('');
  const [formData, setFormData] = useState({
    // General
    platformName: 'InfluenceX',
    supportEmail: 'support@influencex.com',
    supportPhone: '+1 (555) 123-4567',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD',
    
    // Platform Fees
    commissionRate: 10,
    creatorPayoutMin: 50,
    brandEscrowMin: 100,
    withdrawalFee: 0,
    
    // Security
    twoFactorRequired: false,
    emailVerification: true,
    phoneVerification: false,
    maxLoginAttempts: 5,
    sessionTimeout: 30,
    
    // Email Settings
    senderEmail: 'noreply@influencex.com',
    senderName: 'InfluenceX',
    emailFooter: '© 2024 InfluenceX. All rights reserved.',
    
    // Notification Settings
    emailNotifications: {
      newUser: true,
      newCampaign: true,
      paymentReceived: true,
      disputeRaised: true,
      reportGenerated: true
    },
    
    // Moderation
    autoApproveBrands: false,
    autoApproveCreators: false,
    requireVerification: true,
    contentModeration: 'ai',
    
    // Limits
    maxCampaignsPerBrand: 50,
    maxActiveDealsPerCreator: 20,
    maxFileSize: 100,
    allowedFileTypes: ['jpg', 'png', 'mp4', 'pdf', 'doc', 'docx'],

    // Payment Gateway
    paymentProvider: 'stripe',
    stripePublishableKey: '',
    stripeSecretKeyMasked: '',
    stripeWebhookSecretMasked: '',
    paymentTestMode: true,
    autoCapturePayments: false,
    allowApplePay: false,
    allowGooglePay: false,
    invoicePrefix: 'INV'
  });

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        ...settings
      }));
    }
  }, [settings]);

  useEffect(() => {
    setProfileImage(user?.profilePicture || '');
  }, [user?.profilePicture]);

  useEffect(() => {
    if (activeTab === 'security') {
      fetch2FAStatus();
    }
  }, [activeTab]);

  const fetch2FAStatus = async () => {
    const status = await get2FAStatus();
    if (status?.success) {
      setTwoFactorStatus(status.data);
    }
  };

  const handleStart2FASetup = async () => {
    setLoading(true);
    const result = await generate2FA();
    if (result?.success) {
      setQrCodeData(result.data);
      setTwoFactorStep('setup');
      setShow2FAModal(true);
    }
    setLoading(false);
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) return;
    setSaving(true);
    const result = await verify2FA(verificationCode);
    if (result?.success) {
      setBackupCodes(result.data.backupCodes || []);
      setTwoFactorStep('success');
      fetch2FAStatus();
    }
    setSaving(false);
  };

  const handleDisable2FA = async () => {
    const code = prompt('Enter 2FA code to disable:');
    if (!code) return;
    
    setDisabling2FA(true);
    const success = await disable2FA(code);
    if (success) {
      fetch2FAStatus();
    }
    setDisabling2FA(false);
  };

  const tabs = [
    { id: 'general', label: 'General', icon: Globe },
    { id: 'fees', label: 'Fees & Payouts', icon: DollarSign },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'moderation', label: 'Moderation', icon: Users },
    { id: 'limits', label: 'Limits', icon: Lock },
    { id: 'payment', label: 'Payment Gateway', icon: CreditCard },
    { id: 'advanced', label: 'Advanced', icon: SettingsIcon }
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      if (activeTab === 'fees') {
        await updateFees({
          commissionRate: formData.commissionRate,
          creatorPayoutMin: formData.creatorPayoutMin,
          brandEscrowMin: formData.brandEscrowMin,
          withdrawalFee: formData.withdrawalFee
        });
      } else {
        await updateSettings(formData);
      }
      toast.success('Settings saved successfully');
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleClearCache = async () => {
    const success = await clearCache();
    if (success) {
      setShowConfirmModal(false);
    }
  };

  const handleAddFileType = () => {
    const newType = prompt('Enter file extension (e.g., mp4)');
    if (newType && !formData.allowedFileTypes.includes(newType)) {
      setFormData({
        ...formData,
        allowedFileTypes: [...formData.allowedFileTypes, newType]
      });
    }
  };

  const handleRemoveFileType = (type) => {
    setFormData({
      ...formData,
      allowedFileTypes: formData.allowedFileTypes.filter(t => t !== type)
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Platform Settings</h1>
        <div className="flex gap-2">
          <Button variant="outline" icon={RefreshCw} onClick={refreshData}>
            Refresh
          </Button>
          <Button variant="primary" icon={Save} onClick={handleSave} loading={saving}>
            Save Changes
          </Button>
        </div>
      </div>

      {/* Settings Layout */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="flex flex-col md:flex-row">
          {/* Sidebar */}
          <div className="md:w-64 border-r border-gray-200 bg-gray-50">
            <nav className="p-4 space-y-1">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-indigo-100 text-indigo-600'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
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

            {activeTab === 'general' && (
              <div className="space-y-6">
                <ProfilePictureUpload
                  currentImage={profileImage}
                  fullName={user?.fullName}
                  email={user?.email}
                  onUpload={(imageUrl) => {
                    setProfileImage(imageUrl);
                    if (updateUser) {
                      updateUser({ profilePicture: imageUrl, profileImage: imageUrl });
                    }
                    if (refreshUser) {
                      refreshUser();
                    }
                  }}
                />

                <Input
                  label="Platform Name"
                  value={formData.platformName}
                  onChange={(e) => setFormData({...formData, platformName: e.target.value})}
                />
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Support Email"
                    type="email"
                    value={formData.supportEmail}
                    onChange={(e) => setFormData({...formData, supportEmail: e.target.value})}
                  />
                  <Input
                    label="Support Phone"
                    value={formData.supportPhone}
                    onChange={(e) => setFormData({...formData, supportPhone: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Timezone
                    </label>
                    <select
                      value={formData.timezone}
                      onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="America/New_York">Eastern Time</option>
                      <option value="America/Chicago">Central Time</option>
                      <option value="America/Denver">Mountain Time</option>
                      <option value="America/Los_Angeles">Pacific Time</option>
                      <option value="Europe/London">London (GMT)</option>
                      <option value="Europe/Paris">Paris (CET)</option>
                      <option value="Asia/Tokyo">Tokyo (JST)</option>
                      <option value="Australia/Sydney">Sydney (AEST)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Date Format
                    </label>
                    <select
                      value={formData.dateFormat}
                      onChange={(e) => setFormData({...formData, dateFormat: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Default Currency
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="INR">INR (₹)</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'fees' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Commission Rate (%)"
                    type="number"
                    value={formData.commissionRate}
                    onChange={(e) => setFormData({...formData, commissionRate: parseFloat(e.target.value)})}
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <Input
                    label="Withdrawal Fee ($)"
                    type="number"
                    value={formData.withdrawalFee}
                    onChange={(e) => setFormData({...formData, withdrawalFee: parseFloat(e.target.value)})}
                    min="0"
                    step="0.01"
                  />
                  <Input
                    label="Minimum Creator Payout ($)"
                    type="number"
                    value={formData.creatorPayoutMin}
                    onChange={(e) => setFormData({...formData, creatorPayoutMin: parseFloat(e.target.value)})}
                    min="1"
                  />
                  <Input
                    label="Minimum Brand Escrow ($)"
                    type="number"
                    value={formData.brandEscrowMin}
                    onChange={(e) => setFormData({...formData, brandEscrowMin: parseFloat(e.target.value)})}
                    min="1"
                  />
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">Fee changes take effect immediately</p>
                      <p className="text-sm text-yellow-700 mt-1">
                        Changes to commission rates will apply to all new deals created after the update. Existing deals will maintain their original terms.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-800 mb-2">Current Fee Structure</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700">Platform Commission:</span>
                      <span className="ml-2 font-semibold">{fees?.commissionRate || 10}%</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Stripe Fee:</span>
                      <span className="ml-2 font-semibold">2.9% + $0.30</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Creator Payout Min:</span>
                      <span className="ml-2 font-semibold">${fees?.creatorPayoutMin || 50}</span>
                    </div>
                    <div>
                      <span className="text-blue-700">Withdrawal Fee:</span>
                      <span className="ml-2 font-semibold">${fees?.withdrawalFee || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">Require 2FA for Admins</span>
                      <p className="text-sm text-gray-500">All admin accounts must have 2FA enabled</p>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle"
                      checked={formData.twoFactorRequired}
                      onChange={(e) => setFormData({...formData, twoFactorRequired: e.target.checked})}
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">Email Verification</span>
                      <p className="text-sm text-gray-500">Require email verification for new accounts</p>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle"
                      checked={formData.emailVerification}
                      onChange={(e) => setFormData({...formData, emailVerification: e.target.checked})}
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">Phone Verification</span>
                      <p className="text-sm text-gray-500">Require phone verification for new accounts</p>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle"
                      checked={formData.phoneVerification}
                      onChange={(e) => setFormData({...formData, phoneVerification: e.target.checked})}
                    />
                  </label>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Max Login Attempts"
                    type="number"
                    value={formData.maxLoginAttempts}
                    onChange={(e) => setFormData({...formData, maxLoginAttempts: parseInt(e.target.value)})}
                    min="1"
                    max="10"
                  />
                  <Input
                    label="Session Timeout (minutes)"
                    type="number"
                    value={formData.sessionTimeout}
                    onChange={(e) => setFormData({...formData, sessionTimeout: parseInt(e.target.value)})}
                    min="5"
                    max="120"
                  />
                </div>

                <div className="pt-6 border-t border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">My Two-Factor Authentication</h3>
                  <div className="bg-white border rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                          twoFactorStatus?.enabled ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'
                        }`}>
                          <Smartphone className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">
                            Status: {twoFactorStatus?.enabled ? 'Enabled' : 'Disabled'}
                          </p>
                          <p className="text-sm text-gray-500">
                            {twoFactorStatus?.enabled 
                              ? 'Your account is protected with an additional layer of security.' 
                              : 'Add an extra layer of security to your account.'}
                          </p>
                        </div>
                      </div>
                      {twoFactorStatus?.enabled ? (
                        <Button variant="danger" icon={XCircle} onClick={handleDisable2FA} loading={disabling2FA}>
                          Disable 2FA
                        </Button>
                      ) : (
                        <Button variant="primary" icon={Smartphone} onClick={handleStart2FASetup} loading={loading}>
                          Enable 2FA
                        </Button>
                      )}
                    </div>

                    {twoFactorStatus?.enabled && (
                      <div className="bg-blue-50 p-4 rounded-lg flex items-start gap-3">
                        <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-blue-800">2FA is active</p>
                          <p className="text-xs text-blue-700 mt-1">
                            You have {twoFactorStatus.backupCodesCount} backup codes remaining. Keep them in a safe place.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'email' && (
              <div className="space-y-6">
                <Input
                  label="Sender Email"
                  type="email"
                  value={formData.senderEmail}
                  onChange={(e) => setFormData({...formData, senderEmail: e.target.value})}
                />
                <Input
                  label="Sender Name"
                  value={formData.senderName}
                  onChange={(e) => setFormData({...formData, senderName: e.target.value})}
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Footer
                  </label>
                  <textarea
                    rows="3"
                    value={formData.emailFooter}
                    onChange={(e) => setFormData({...formData, emailFooter: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
                  <div className="space-y-3">
                    {Object.entries(formData.emailNotifications).map(([key, value]) => (
                      <label key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                        <span className="text-sm font-medium text-gray-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </span>
                        <input
                          type="checkbox"
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          checked={value}
                          onChange={(e) => setFormData({
                            ...formData,
                            emailNotifications: {
                              ...formData.emailNotifications,
                              [key]: e.target.checked
                            }
                          })}
                        />
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'moderation' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">Auto-approve Brands</span>
                      <p className="text-sm text-gray-500">Automatically approve brand accounts</p>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle"
                      checked={formData.autoApproveBrands}
                      onChange={(e) => setFormData({...formData, autoApproveBrands: e.target.checked})}
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">Auto-approve Creators</span>
                      <p className="text-sm text-gray-500">Automatically approve creator accounts</p>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle"
                      checked={formData.autoApproveCreators}
                      onChange={(e) => setFormData({...formData, autoApproveCreators: e.target.checked})}
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">Require Verification</span>
                      <p className="text-sm text-gray-500">Require ID verification for all users</p>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle"
                      checked={formData.requireVerification}
                      onChange={(e) => setFormData({...formData, requireVerification: e.target.checked})}
                    />
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Content Moderation
                  </label>
                  <select
                    value={formData.contentModeration}
                    onChange={(e) => setFormData({...formData, contentModeration: e.target.value})}
                    className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="ai">AI Only</option>
                    <option value="manual">Manual Review Only</option>
                    <option value="hybrid">AI + Manual Review</option>
                  </select>
                </div>
              </div>
            )}

            {activeTab === 'limits' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Input
                    label="Max Campaigns per Brand"
                    type="number"
                    value={formData.maxCampaignsPerBrand}
                    onChange={(e) => setFormData({...formData, maxCampaignsPerBrand: parseInt(e.target.value)})}
                    min="1"
                  />
                  <Input
                    label="Max Active Deals per Creator"
                    type="number"
                    value={formData.maxActiveDealsPerCreator}
                    onChange={(e) => setFormData({...formData, maxActiveDealsPerCreator: parseInt(e.target.value)})}
                    min="1"
                  />
                  <Input
                    label="Max File Size (MB)"
                    type="number"
                    value={formData.maxFileSize}
                    onChange={(e) => setFormData({...formData, maxFileSize: parseInt(e.target.value)})}
                    min="1"
                    max="500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Allowed File Types
                  </label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {formData.allowedFileTypes.map((type, index) => (
                      <span key={index} className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm flex items-center">
                        .{type}
                        <button
                          onClick={() => handleRemoveFileType(type)}
                          className="ml-2 text-indigo-600 hover:text-indigo-800"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleAddFileType}>
                    Add File Type
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'payment' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Gateway Provider
                    </label>
                    <select
                      value={formData.paymentProvider}
                      onChange={(e) => setFormData({ ...formData, paymentProvider: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="stripe">Stripe</option>
                      <option value="manual">Manual (Offline)</option>
                    </select>
                  </div>

                  <Input
                    label="Invoice Prefix"
                    value={formData.invoicePrefix}
                    onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value.toUpperCase().slice(0, 8) })}
                  />
                </div>

                <Input
                  label="Stripe Publishable Key"
                  value={formData.stripePublishableKey}
                  onChange={(e) => setFormData({ ...formData, stripePublishableKey: e.target.value })}
                  placeholder="pk_live_..."
                />

                <Input
                  label="Stripe Secret Key (masked)"
                  value={formData.stripeSecretKeyMasked}
                  onChange={(e) => setFormData({ ...formData, stripeSecretKeyMasked: e.target.value })}
                  placeholder="sk_live_************************"
                />

                <Input
                  label="Stripe Webhook Secret (masked)"
                  value={formData.stripeWebhookSecretMasked}
                  onChange={(e) => setFormData({ ...formData, stripeWebhookSecretMasked: e.target.value })}
                  placeholder="whsec_************************"
                />

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">Test Mode</span>
                      <p className="text-sm text-gray-500">Process payments in Stripe test environment</p>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle"
                      checked={formData.paymentTestMode}
                      onChange={(e) => setFormData({ ...formData, paymentTestMode: e.target.checked })}
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">Auto-capture Charges</span>
                      <p className="text-sm text-gray-500">Capture authorized charges immediately</p>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle"
                      checked={formData.autoCapturePayments}
                      onChange={(e) => setFormData({ ...formData, autoCapturePayments: e.target.checked })}
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">Enable Apple Pay</span>
                      <p className="text-sm text-gray-500">Show Apple Pay when supported</p>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle"
                      checked={formData.allowApplePay}
                      onChange={(e) => setFormData({ ...formData, allowApplePay: e.target.checked })}
                    />
                  </label>

                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <span className="font-medium text-gray-900">Enable Google Pay</span>
                      <p className="text-sm text-gray-500">Show Google Pay when supported</p>
                    </div>
                    <input
                      type="checkbox"
                      className="toggle"
                      checked={formData.allowGooglePay}
                      onChange={(e) => setFormData({ ...formData, allowGooglePay: e.target.checked })}
                    />
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-6">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-4">System Actions</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setConfirmAction('cache');
                        setShowConfirmModal(true);
                      }}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-white transition-colors"
                    >
                      <p className="font-medium text-gray-900">Clear Cache</p>
                      <p className="text-sm text-gray-500">Clear all system caches to free up memory</p>
                    </button>

                    <button
                      onClick={() => {
                        setConfirmAction('logs');
                        setShowConfirmModal(true);
                      }}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-white transition-colors"
                    >
                      <p className="font-medium text-gray-900">Rotate Logs</p>
                      <p className="text-sm text-gray-500">Archive and rotate system logs</p>
                    </button>

                    <button
                      onClick={() => {
                        setConfirmAction('backup');
                        setShowConfirmModal(true);
                      }}
                      className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-white transition-colors"
                    >
                      <p className="font-medium text-gray-900">Create Backup</p>
                      <p className="text-sm text-gray-500">Create a manual backup of the database</p>
                    </button>
                  </div>
                </div>

                <div className="p-4 bg-red-50 rounded-lg">
                  <h3 className="font-medium text-red-800 mb-4">Danger Zone</h3>
                  <div className="space-y-3">
                    <button
                      onClick={() => {
                        setConfirmAction('maintenance');
                        setShowConfirmModal(true);
                      }}
                      className="w-full text-left p-3 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <p className="font-medium text-red-600">Enable Maintenance Mode</p>
                      <p className="text-sm text-gray-600">Temporarily disable the platform for maintenance</p>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Action Modal */}
      <Modal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setConfirmAction(null);
        }}
        title="Confirm Action"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to {confirmAction === 'cache' ? 'clear the cache' : 
              confirmAction === 'logs' ? 'rotate logs' :
              confirmAction === 'backup' ? 'create a backup' :
              'enable maintenance mode'}?
          </p>
          {confirmAction === 'maintenance' && (
            <div className="bg-yellow-50 p-4 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Warning:</strong> Users will not be able to access the platform during maintenance.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)}>
            Cancel
          </Button>
          <Button 
            variant={confirmAction === 'maintenance' ? 'danger' : 'primary'}
            onClick={confirmAction === 'cache' ? handleClearCache : () => setShowConfirmModal(false)}
          >
            Confirm
          </Button>
        </div>
      </Modal>

      {/* 2FA Setup Modal */}
      <Modal
        isOpen={show2FAModal}
        onClose={() => {
          if (twoFactorStep !== 'success') {
            setShow2FAModal(false);
          }
        }}
        title={
          twoFactorStep === 'setup' ? 'Setup 2FA' : 
          twoFactorStep === 'verify' ? 'Verify Code' : 
          '2FA Enabled Successfully'
        }
      >
        <div className="space-y-6">
          {twoFactorStep === 'setup' && (
            <div className="text-center space-y-4">
              <p className="text-gray-600 text-sm">
                Scan this QR code with your authenticator app (e.g., Google Authenticator, Authy).
              </p>
              <div className="flex justify-center p-4 bg-white border rounded-lg">
                {qrCodeData?.qrCode ? (
                  <img src={qrCodeData.qrCode} alt="QR Code" className="w-48 h-48" />
                ) : (
                  <div className="w-48 h-48 bg-gray-100 animate-pulse" />
                )}
              </div>
              <div className="text-left bg-gray-50 p-3 rounded-lg border">
                <p className="text-xs text-gray-500 font-medium uppercase mb-1">Manual Entry Key</p>
                <code className="text-sm font-mono break-all text-indigo-600">
                  {qrCodeData?.secret}
                </code>
              </div>
              <Button className="w-full" onClick={() => setTwoFactorStep('verify')}>
                I've scanned it, continue
              </Button>
            </div>
          )}

          {twoFactorStep === 'verify' && (
            <div className="space-y-4">
              <p className="text-center text-gray-600 text-sm">
                Enter the 6-digit code from your app to verify the setup.
              </p>
              <input
                type="text"
                maxLength={6}
                autoFocus
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-3xl tracking-widest focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
              />
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setTwoFactorStep('setup')}>
                  Back
                </Button>
                <Button 
                  variant="primary" 
                  className="flex-1" 
                  onClick={handleVerify2FA} 
                  loading={saving}
                  disabled={verificationCode.length !== 6}
                >
                  Verify & Enable
                </Button>
              </div>
            </div>
          )}

          {twoFactorStep === 'success' && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10" />
                </div>
              </div>
              <p className="text-center text-gray-600">
                Two-factor authentication is now active on your account.
              </p>
              
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <h4 className="text-yellow-800 font-semibold mb-2 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Save Your Backup Codes
                </h4>
                <p className="text-xs text-yellow-700 mb-3">
                  If you lose your phone, you can use these codes to log in. Each code can only be used once.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, idx) => (
                    <code key={idx} className="bg-white px-2 py-1 rounded border text-xs text-center font-mono">
                      {code}
                    </code>
                  ))}
                </div>
              </div>

              <Button 
                variant="primary" 
                className="w-full" 
                onClick={() => {
                  setShow2FAModal(false);
                  setTwoFactorStep('initial');
                  setVerificationCode('');
                }}
              >
                Close & Finish
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default AdminSettings;