import React, { useState } from 'react';
import {
  Bell,
  Shield,
  Globe,
  Mail,
  Lock,
  Palette,
  Eye,
  User,
  Moon,
  Sun,
  Save,
  Camera,
  Instagram,
  Youtube,
  Twitter,
  MapPin,
  Link2,
  Phone,
  ChevronRight,
  CreditCard,
  DollarSign,
  Clock,
  Languages,
  Volume2,
  Monitor,
  Smartphone,
  Tablet,
  Wifi,
  Bluetooth,
  Battery,
  Download,
  Upload,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle,
  XCircle,
  HelpCircle,
  FileText,
  BookOpen,
  MessageCircle,
  Headphones,
  Zap,
  Award,
  Star,
  TrendingUp,
  Users,
  Briefcase,
  Calendar,
  Settings as SettingsIcon
} from 'lucide-react';
import Button from '../UI/Button';
import Input from '../UI/Input';
import Modal from './Modal';

const Settings = ({ userType = 'user' }) => {
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const [settings, setSettings] = useState({
    // Profile
    displayName: 'Sarah Johnson',
    handle: '@sarahstyle',
    bio: 'Fashion & lifestyle creator | Making the world more stylish one post at a time ✨\n✨ 45K+ followers\n📧 sarah@example.com\n🌐 www.sarahstyle.com',
    location: 'New York, USA',
    website: 'www.sarahstyle.com',
    email: 'sarah@example.com',
    phone: '+1 (555) 123-4567',
    birthday: '1995-06-15',
    gender: 'female',
    
    // Social
    instagram: '@sarahstyle',
    youtube: '@sarahstyle',
    tiktok: '@sarahstyle',
    twitter: '@sarahstyle',
    facebook: 'sarah.style',
    linkedin: 'sarahjohnson',
    
    // Notifications
    emailNotifications: {
      deals: true,
      messages: true,
      payments: true,
      campaigns: true,
      marketing: false,
      newsletter: false,
      reminders: true,
      updates: true
    },
    pushNotifications: {
      deals: true,
      messages: true,
      payments: true,
      campaigns: false,
      reminders: true,
      mentions: true
    },
    
    // Privacy
    profileVisibility: 'public',
    showEmail: false,
    showPhone: false,
    showLocation: true,
    showAnalytics: true,
    showEarnings: false,
    allowMessages: 'everyone',
    allowMentions: 'everyone',
    
    // Security
    twoFactorAuth: false,
    loginAlerts: true,
    deviceHistory: true,
    sessionTimeout: '30',
    
    // Appearance
    theme: 'light',
    fontSize: 'medium',
    colorScheme: 'indigo',
    density: 'comfortable',
    animations: true,
    
    // Language & Region
    language: 'en',
    timezone: 'America/New_York',
    dateFormat: 'MM/DD/YYYY',
    timeFormat: '12h',
    firstDayOfWeek: 'sunday',
    
    // Payment
    currency: 'USD',
    autoWithdraw: false,
    withdrawThreshold: '100',
    paymentMethods: [
      { id: 1, type: 'paypal', email: 'sarah@example.com', default: true },
      { id: 2, type: 'bank', name: 'Chase Bank', account: '****1234', default: false }
    ],
    
    // Content
    autoApprove: false,
    contentWatermark: true,
    defaultRights: 'standard',
    allowReposts: true,
    
    // Accessibility
    highContrast: false,
    reduceMotion: false,
    screenReader: false,
    fontSize: 'medium',
    
    // Advanced
    developerMode: false,
    debugMode: false,
    betaFeatures: false,
    analytics: true
  });

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'account', label: 'Account', icon: Shield },
    { id: 'privacy', label: 'Privacy', icon: Eye },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'language', label: 'Language & Region', icon: Globe },
    { id: 'security', label: 'Security', icon: Lock },
    { id: 'payment', label: 'Payment', icon: DollarSign },
    { id: 'content', label: 'Content', icon: FileText },
    { id: 'accessibility', label: 'Accessibility', icon: HelpCircle },
    { id: 'advanced', label: 'Advanced', icon: SettingsIcon }
  ];

  const handleSave = () => {
    console.log('Saving settings:', settings);
    setIsEditing(false);
  };

  const handleDeleteAccount = () => {
    console.log('Deleting account...');
    setShowDeleteModal(false);
  };

  const handleChangePassword = (data) => {
    console.log('Changing password:', data);
    setShowPasswordModal(false);
  };

  const handleExportData = () => {
    console.log('Exporting data...');
    setShowExportModal(false);
  };

  const renderTabContent = () => {
    switch(activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            {/* Profile Picture */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <img
                  src="https://via.placeholder.com/100"
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
                <button className="absolute bottom-0 right-0 bg-[#667eea] text-white p-1.5 rounded-full hover:bg-[#5a67d8] transition-colors">
                  <Camera className="w-4 h-4" />
                </button>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{settings.displayName}</h3>
                <p className="text-sm text-gray-500">{settings.handle}</p>
                <Button variant="outline" size="sm" className="mt-2" icon={Camera}>
                  Change Photo
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Display Name"
                value={settings.displayName}
                onChange={(e) => setSettings({...settings, displayName: e.target.value})}
                disabled={!isEditing}
              />
              <Input
                label="Handle"
                value={settings.handle}
                onChange={(e) => setSettings({...settings, handle: e.target.value})}
                disabled={!isEditing}
              />
              <Input
                label="Email"
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({...settings, email: e.target.value})}
                disabled={!isEditing}
                icon={Mail}
              />
              <Input
                label="Phone"
                value={settings.phone}
                onChange={(e) => setSettings({...settings, phone: e.target.value})}
                disabled={!isEditing}
                icon={Phone}
              />
              <Input
                label="Location"
                value={settings.location}
                onChange={(e) => setSettings({...settings, location: e.target.value})}
                disabled={!isEditing}
                icon={MapPin}
              />
              <Input
                label="Website"
                value={settings.website}
                onChange={(e) => setSettings({...settings, website: e.target.value})}
                disabled={!isEditing}
                icon={Link2}
              />
              <Input
                label="Birthday"
                type="date"
                value={settings.birthday}
                onChange={(e) => setSettings({...settings, birthday: e.target.value})}
                disabled={!isEditing}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Gender
                </label>
                <select
                  value={settings.gender}
                  onChange={(e) => setSettings({...settings, gender: e.target.value})}
                  disabled={!isEditing}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="female">Female</option>
                  <option value="male">Male</option>
                  <option value="non-binary">Non-binary</option>
                  <option value="prefer-not">Prefer not to say</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                rows="4"
                value={settings.bio}
                onChange={(e) => setSettings({...settings, bio: e.target.value})}
                disabled={!isEditing}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500 disabled:bg-gray-50"
              />
              <p className="text-xs text-gray-500 mt-1">
                Maximum 500 characters. {settings.bio.length}/500
              </p>
            </div>

            <div className="flex justify-end">
              {!isEditing ? (
                <Button variant="primary" onClick={() => setIsEditing(true)}>
                  Edit Profile
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" onClick={handleSave} icon={Save}>
                    Save Changes
                  </Button>
                </div>
              )}
            </div>
          </div>
        );

      case 'account':
        return (
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-6 bg-gray-50 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Account Information</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email Address</p>
                    <p className="text-sm text-gray-500">{settings.email}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Change
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Phone Number</p>
                    <p className="text-sm text-gray-500">{settings.phone}</p>
                  </div>
                  <Button variant="outline" size="sm">
                    Change
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Password</p>
                    <p className="text-sm text-gray-500">Last changed 30 days ago</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    Change
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-6 bg-gray-50 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Connected Accounts</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Google className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Google</p>
                      <p className="text-sm text-gray-500">Connected as {settings.email}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Disconnect
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Facebook className="w-5 h-5 text-blue-600" />
                    <div>
                      <p className="font-medium">Facebook</p>
                      <p className="text-sm text-gray-500">Not connected</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Connect
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Apple className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Apple</p>
                      <p className="text-sm text-gray-500">Not connected</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Connect
                  </Button>
                </div>
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-6 bg-gray-50 border-b border-gray-200">
                <h3 className="font-medium text-gray-900">Data & Privacy</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Download Your Data</p>
                    <p className="text-sm text-gray-500">Get a copy of all your data</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    icon={Download}
                    onClick={() => setShowExportModal(true)}
                  >
                    Request Data
                  </Button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-600">Delete Account</p>
                    <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
                  </div>
                  <Button 
                    variant="danger" 
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          </div>
        );

      case 'privacy':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Profile Visibility
              </label>
              <select
                value={settings.profileVisibility}
                onChange={(e) => setSettings({...settings, profileVisibility: e.target.value})}
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="public">Public - Everyone can see</option>
                <option value="brands">Brands Only - Only brands</option>
                <option value="private">Private - Only approved</option>
              </select>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Profile Information</h3>
              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-700">Show Email</span>
                  <p className="text-xs text-gray-500">Display your email on profile</p>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 text-[#667eea] border-gray-300 rounded"
                  checked={settings.showEmail}
                  onChange={(e) => setSettings({...settings, showEmail: e.target.checked})}
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-700">Show Phone</span>
                  <p className="text-xs text-gray-500">Display your phone number on profile</p>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 text-[#667eea] border-gray-300 rounded"
                  checked={settings.showPhone}
                  onChange={(e) => setSettings({...settings, showPhone: e.target.checked})}
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-700">Show Location</span>
                  <p className="text-xs text-gray-500">Display your location on profile</p>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 text-[#667eea] border-gray-300 rounded"
                  checked={settings.showLocation}
                  onChange={(e) => setSettings({...settings, showLocation: e.target.checked})}
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-700">Show Analytics</span>
                  <p className="text-xs text-gray-500">Display engagement metrics on profile</p>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 text-[#667eea] border-gray-300 rounded"
                  checked={settings.showAnalytics}
                  onChange={(e) => setSettings({...settings, showAnalytics: e.target.checked})}
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="text-sm font-medium text-gray-700">Show Earnings</span>
                  <p className="text-xs text-gray-500">Display earnings on profile</p>
                </div>
                <input
                  type="checkbox"
                  className="w-4 h-4 text-[#667eea] border-gray-300 rounded"
                  checked={settings.showEarnings}
                  onChange={(e) => setSettings({...settings, showEarnings: e.target.checked})}
                />
              </label>
            </div>

            <div className="space-y-3">
              <h3 className="font-medium text-gray-900">Communication</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Who can message you?
                </label>
                <select
                  value={settings.allowMessages}
                  onChange={(e) => setSettings({...settings, allowMessages: e.target.value})}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="everyone">Everyone</option>
                  <option value="brands">Brands only</option>
                  <option value="verified">Verified users only</option>
                  <option value="none">No one</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Who can mention you?
                </label>
                <select
                  value={settings.allowMentions}
                  onChange={(e) => setSettings({...settings, allowMentions: e.target.value})}
                  className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="everyone">Everyone</option>
                  <option value="brands">Brands only</option>
                  <option value="verified">Verified users only</option>
                  <option value="none">No one</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'notifications':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Email Notifications</h3>
              <div className="space-y-3">
                {Object.entries(settings.emailNotifications).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <span className="text-sm text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-[#667eea] border-gray-300 rounded focus:ring-[#667eea]"
                      checked={value}
                      onChange={(e) => setSettings({
                        ...settings,
                        emailNotifications: {
                          ...settings.emailNotifications,
                          [key]: e.target.checked
                        }
                      })}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Push Notifications</h3>
              <div className="space-y-3">
                {Object.entries(settings.pushNotifications).map(([key, value]) => (
                  <label key={key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                    <span className="text-sm text-gray-700 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-[#667eea] border-gray-300 rounded focus:ring-[#667eea]"
                      checked={value}
                      onChange={(e) => setSettings({
                        ...settings,
                        pushNotifications: {
                          ...settings.pushNotifications,
                          [key]: e.target.checked
                        }
                      })}
                    />
                  </label>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quiet Hours</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">From</label>
                  <input type="time" className="w-full px-4 py-2 border border-gray-300 rounded-lg" defaultValue="22:00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">To</label>
                  <input type="time" className="w-full px-4 py-2 border border-gray-300 rounded-lg" defaultValue="08:00" />
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Theme</h3>
              <div className="flex gap-4">
                <button
                  onClick={() => setSettings({...settings, theme: 'light'})}
                  className={`p-4 border-2 rounded-lg flex items-center gap-3 flex-1 ${
                    settings.theme === 'light' ? 'border-[#667eea] bg-[#667eea]/10' : 'border-gray-200'
                  }`}
                >
                  <Sun className="w-5 h-5" />
                  <span className="font-medium">Light</span>
                </button>
                <button
                  onClick={() => setSettings({...settings, theme: 'dark'})}
                  className={`p-4 border-2 rounded-lg flex items-center gap-3 flex-1 ${
                    settings.theme === 'dark' ? 'border-[#667eea] bg-[#667eea]/10' : 'border-gray-200'
                  }`}
                >
                  <Moon className="w-5 h-5" />
                  <span className="font-medium">Dark</span>
                </button>
                <button
                  onClick={() => setSettings({...settings, theme: 'system'})}
                  className={`p-4 border-2 rounded-lg flex items-center gap-3 flex-1 ${
                    settings.theme === 'system' ? 'border-[#667eea] bg-[#667eea]/10' : 'border-gray-200'
                  }`}
                >
                  <Monitor className="w-5 h-5" />
                  <span className="font-medium">System</span>
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Font Size</h3>
              <div className="flex gap-4">
                {['small', 'medium', 'large'].map((size) => (
                  <button
                    key={size}
                    onClick={() => setSettings({...settings, fontSize: size})}
                    className={`px-4 py-2 border-2 rounded-lg capitalize flex-1 ${
                      settings.fontSize === size ? 'border-[#667eea] bg-[#667eea]/10' : 'border-gray-200'
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Color Scheme</h3>
              <div className="flex gap-4">
                {['indigo', 'blue', 'green', 'purple', 'orange'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setSettings({...settings, colorScheme: color})}
                    className={`w-12 h-12 rounded-full border-2 transition-all ${
                      settings.colorScheme === color ? 'border-gray-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ 
                      backgroundColor: 
                        color === 'indigo' ? '#4f46e5' : 
                        color === 'blue' ? '#3b82f6' : 
                        color === 'green' ? '#22c55e' : 
                        color === 'purple' ? '#a855f7' : '#f97316'
                    }}
                  />
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Layout Density</h3>
              <div className="flex gap-4">
                {['compact', 'comfortable', 'spacious'].map((density) => (
                  <button
                    key={density}
                    onClick={() => setSettings({...settings, density})}
                    className={`px-4 py-2 border-2 rounded-lg capitalize flex-1 ${
                      settings.density === density ? 'border-[#667eea] bg-[#667eea]/10' : 'border-gray-200'
                    }`}
                  >
                    {density}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <span className="text-sm font-medium text-gray-700">Enable Animations</span>
                <p className="text-xs text-gray-500">Show animations and transitions</p>
              </div>
              <input
                type="checkbox"
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                checked={settings.animations}
                onChange={(e) => setSettings({...settings, animations: e.target.checked})}
              />
            </label>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Language
              </label>
              <select
                value={settings.language}
                onChange={(e) => setSettings({...settings, language: e.target.value})}
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="fr">Français</option>
                <option value="de">Deutsch</option>
                <option value="it">Italiano</option>
                <option value="pt">Português</option>
                <option value="ja">日本語</option>
                <option value="ko">한국어</option>
                <option value="zh">中文</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Timezone
              </label>
              <select
                value={settings.timezone}
                onChange={(e) => setSettings({...settings, timezone: e.target.value})}
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="America/New_York">Eastern Time (ET)</option>
                <option value="America/Chicago">Central Time (CT)</option>
                <option value="America/Denver">Mountain Time (MT)</option>
                <option value="America/Los_Angeles">Pacific Time (PT)</option>
                <option value="Europe/London">London (GMT)</option>
                <option value="Europe/Paris">Paris (CET)</option>
                <option value="Asia/Tokyo">Tokyo (JST)</option>
                <option value="Australia/Sydney">Sydney (AEST)</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Date Format
                </label>
                <select
                  value={settings.dateFormat}
                  onChange={(e) => setSettings({...settings, dateFormat: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Time Format
                </label>
                <select
                  value={settings.timeFormat}
                  onChange={(e) => setSettings({...settings, timeFormat: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                >
                  <option value="12h">12-hour (12:00 PM)</option>
                  <option value="24h">24-hour (13:00)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                First Day of Week
              </label>
              <select
                value={settings.firstDayOfWeek}
                onChange={(e) => setSettings({...settings, firstDayOfWeek: e.target.value})}
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg"
              >
                <option value="sunday">Sunday</option>
                <option value="monday">Monday</option>
              </select>
            </div>
          </div>
        );

      case 'security':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Two-Factor Authentication</h4>
                <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
              </div>
              <button className={`px-4 py-2 rounded-lg text-sm font-medium ${
                settings.twoFactorAuth 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-[#667eea] text-white hover:bg-[#5a67d8] transition-colors'
              }`}>
                {settings.twoFactorAuth ? 'Enabled' : 'Enable'}
              </button>
            </div>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Login Alerts</h4>
                <p className="text-sm text-gray-500">Get notified about new logins to your account</p>
              </div>
              <input
                type="checkbox"
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                checked={settings.loginAlerts}
                onChange={(e) => setSettings({...settings, loginAlerts: e.target.checked})}
              />
            </label>

            <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-900">Device History</h4>
                <p className="text-sm text-gray-500">Track devices that access your account</p>
              </div>
              <input
                type="checkbox"
                className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
                checked={settings.deviceHistory}
                onChange={(e) => setSettings({...settings, deviceHistory: e.target.checked})}
              />
            </label>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={settings.sessionTimeout}
                onChange={(e) => setSettings({...settings, sessionTimeout: e.target.value})}
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg"
                min="5"
                max="120"
              />
            </div>

            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <h4 className="font-medium text-gray-900">Active Sessions</h4>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Monitor className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Chrome • Windows</p>
                      <p className="text-xs text-gray-500">New York, USA • Current session</p>
                    </div>
                  </div>
                  <span className="text-xs text-green-600">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Smartphone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Safari • iPhone</p>
                      <p className="text-xs text-gray-500">New York, USA • 2 hours ago</p>
                    </div>
                  </div>
                  <button className="text-sm text-red-600">Revoke</button>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Tablet className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium">Chrome • iPad</p>
                      <p className="text-xs text-gray-500">Los Angeles, USA • 1 day ago</p>
                    </div>
                  </div>
                  <button className="text-sm text-red-600">Revoke</button>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        {isEditing && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSave} icon={Save}>
              Save Changes
            </Button>
          </div>
        )}
      </div>

      {/* Settings Layout */}
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
                    className={`w-full flex items-center justify-between px-4 py-3 text-sm font-medium rounded-lg transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[#667eea]/10 text-[#667eea]'
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
            placeholder="Enter current password"
          />
          <Input
            type="password"
            label="New Password"
            placeholder="Enter new password"
          />
          <Input
            type="password"
            label="Confirm New Password"
            placeholder="Confirm new password"
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
          <Button variant="primary" onClick={() => setShowPasswordModal(false)}>
            Update Password
          </Button>
        </div>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Account"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-600 bg-red-50 p-4 rounded-lg">
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm">
              This action is permanent and cannot be undone. All your data will be permanently deleted.
            </p>
          </div>

          <Input
            type="password"
            label="Confirm Password"
            placeholder="Enter your password to confirm"
          />

          <div>
            <label className="flex items-center">
              <input type="checkbox" className="rounded border-gray-300 text-red-600" />
              <span className="ml-2 text-sm text-gray-600">
                I understand that this action is permanent
              </span>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowDeleteModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDeleteAccount}>
            Delete Account
          </Button>
        </div>
      </Modal>

      {/* Export Data Modal */}
      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Export Your Data"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            You can request a copy of your data. We'll prepare it and send you an email when it's ready.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select data to export
            </label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                <span className="ml-2 text-sm">Profile information</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                <span className="ml-2 text-sm">Campaign history</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                <span className="ml-2 text-sm">Payment records</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300" defaultChecked />
                <span className="ml-2 text-sm">Messages</span>
              </label>
              <label className="flex items-center">
                <input type="checkbox" className="rounded border-gray-300" />
                <span className="ml-2 text-sm">Analytics data</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Export format
            </label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg">
              <option>JSON</option>
              <option>CSV</option>
              <option>PDF</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="secondary" onClick={() => setShowExportModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleExportData}>
            Request Export
          </Button>
        </div>
      </Modal>
    </div>
  );
};

export default Settings;