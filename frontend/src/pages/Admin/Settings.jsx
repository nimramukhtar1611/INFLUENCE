import React, { useState, useEffect } from 'react';
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
  Smartphone,
  Monitor,
  HelpCircle
} from 'lucide-react';
import { useAdminData } from '../../hooks/useAdminData';
import Button from '../../components/UI/Button';
import Input from '../../components/UI/Input';
import Modal from '../../components/Common/Modal';
import toast from 'react-hot-toast';

const AdminSettings = () => {
  const { settings, fees, updateSettings, updateFees, clearCache, refreshData } = useAdminData();
  
  const [activeTab, setActiveTab] = useState('general');
  const [saving, setSaving] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
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
    allowedFileTypes: ['jpg', 'png', 'mp4', 'pdf', 'doc', 'docx']
  });

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({
        ...prev,
        ...settings
      }));
    }
  }, [settings]);

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
    </div>
  );
};

export default AdminSettings;