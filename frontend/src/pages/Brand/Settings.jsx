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
import authService from '../../services/authService';
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

  // 2FA State
  const [twoFactorStatus, setTwoFactorStatus] = useState(null);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorStep, setTwoFactorStep] = useState('initial'); // initial, setup, verify, success
  const [qrCodeData, setQrCodeData] = useState(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [backupCodes, setBackupCodes] = useState([]);
  const [disabling2FA, setDisabling2FA] = useState(false);

  const tabs = [
    { id: 'profile', label: 'Profile Info', icon: User },
    { id: 'company', label: 'Company Details', icon: Building2 },
    { id: 'social', label: 'Social Media', icon: Instagram },
    { id: 'security', label: 'Security', icon: Lock }
  ];

  useEffect(() => {
    if (activeTab === 'security') {
      fetch2FAStatus();
    }
  }, [activeTab]);

  const fetch2FAStatus = async () => {
    try {
      const res = await authService.get2FAStatus();
      if (res?.success) {
        setTwoFactorStatus(res.data);
      }
    } catch (error) {
      console.error('Error fetching 2FA status:', error);
    }
  };

  const handleStart2FASetup = async () => {
    try {
      setSaving(true);
      const res = await authService.generate2FA();
      if (res?.success) {
        setQrCodeData(res.data);
        setTwoFactorStep('setup');
        setShow2FAModal(true);
      }
    } catch (error) {
      toast.error('Failed to generate 2FA secret');
    } finally {
      setSaving(false);
    }
  };

  const handleVerify2FA = async () => {
    if (verificationCode.length !== 6) return;
    try {
      setSaving(true);
      const res = await authService.verifyAndEnable2FA(verificationCode);
      if (res?.success) {
        setBackupCodes(res.data.backupCodes || []);
        setTwoFactorStep('success');
        fetch2FAStatus();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to verify 2FA code');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable2FA = async () => {
    const code = prompt('Enter 2FA code to disable authentication:');
    if (!code) return;
    
    try {
      setDisabling2FA(true);
      const res = await authService.disable2FA(code);
      if (res?.success) {
        toast.success('Two-factor authentication disabled');
        fetch2FAStatus();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to disable 2FA');
    } finally {
      setDisabling2FA(false);
    }
  };

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

            <div className="pt-6 border-t border-gray-200">
              <h4 className="text-lg font-medium text-gray-900 mb-4">Two-Factor Authentication</h4>
              <div className="bg-white border rounded-xl p-6">
                <div className="flex items-center justify-between">
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
                          : 'Add an extra layer of security to your account using an authenticator app.'}
                      </p>
                    </div>
                  </div>
                  {twoFactorStatus?.enabled ? (
                    <Button variant="danger" onClick={handleDisable2FA} loading={disabling2FA}>
                      Disable 2FA
                    </Button>
                  ) : (
                    <Button variant="primary" onClick={handleStart2FASetup} loading={saving}>
                      Enable 2FA
                    </Button>
                  )}
                </div>

                {twoFactorStatus?.enabled && (
                  <div className="mt-6 bg-blue-50 p-4 rounded-xl flex items-start gap-3">
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

      {/* 2FA Setup Modal */}
      <Modal
        isOpen={show2FAModal}
        onClose={() => {
          if (twoFactorStep !== 'success') {
            setShow2FAModal(false);
          }
        }}
        title={
          twoFactorStep === 'setup' ? 'Setup Two-Factor Authentication' : 
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
                  <div className="w-48 h-48 bg-gray-100 animate-spin flex items-center justify-center">
                    <Loader className="w-8 h-8 text-indigo-500" />
                  </div>
                )}
              </div>
              <div className="text-left bg-gray-50 p-3 rounded-lg border">
                <p className="text-xs text-gray-500 font-medium uppercase mb-1">Manual Entry Key</p>
                <code className="text-sm font-mono break-all text-indigo-600 font-bold">
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
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-center text-3xl tracking-widest font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
                <h4 className="text-yellow-800 font-semibold mb-2 flex items-center gap-2 text-sm">
                  <Smartphone className="w-4 h-4" />
                  Save Your Backup Codes
                </h4>
                <p className="text-xs text-yellow-700 mb-3">
                  If you lose your phone, you can use these codes to log in. Each code can only be used once.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {backupCodes.map((code, idx) => (
                    <code key={idx} className="bg-white px-2 py-1 rounded border text-xs text-center font-mono font-bold">
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

export default BrandSettings;