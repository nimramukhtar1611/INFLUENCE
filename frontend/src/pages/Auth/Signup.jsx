import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ReCAPTCHA from "react-google-recaptcha";
import {
  Mail, Lock, User, Phone, Globe,
  ArrowRight, Eye, EyeOff, Shield, CheckCircle, Building2, Sparkles
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import OTPVerification from '../../components/Auth/OTPVerification';
import toast from 'react-hot-toast';

const Signup = () => {
  const [searchParams] = useSearchParams();
  const defaultType = searchParams.get('type') || 'brand';
  const [userType, setUserType] = useState(defaultType);
  const [step, setStep] = useState(1);
  const [showOTP, setShowOTP] = useState(false);
  const [otpDestination, setOtpDestination] = useState('');
  const [otpType, setOtpType] = useState('email');
  const navigate = useNavigate();

  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = React.useRef();

  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  const {
    signup,
    sendEmailOTP,
    sendPhoneOTP,
    verifyEmailOTP,
    verifyPhoneOTP,
    loading: authLoading
  } = useAuth();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    brandName: '',
    industry: '',
    website: '',
    displayName: '',
    handle: '',
    niche: '',
  });

  // Helper function to format phone numbers
  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    let cleaned = phone.replace(/[^\d+]/g, '');
    if (!cleaned.startsWith('+')) {
      if (cleaned.startsWith('1')) {
        cleaned = cleaned.substring(1);
      }
      cleaned = '+1' + cleaned;
    }
    return cleaned;
  };

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const brandIndustries = [
    { value: 'Fashion', label: 'Fashion & Apparel' },
    { value: 'Beauty', label: 'Beauty & Cosmetics' },
    { value: 'Technology', label: 'Technology' },
    { value: 'Food & Beverage', label: 'Food & Beverage' },
    { value: 'Fitness', label: 'Fitness & Wellness' },
    { value: 'Travel', label: 'Travel & Tourism' },
    { value: 'Gaming', label: 'Gaming' },
    { value: 'Lifestyle', label: 'Lifestyle' },
    { value: 'Other', label: 'Other' }
  ];

  const creatorNiches = [
    { value: 'Fashion', label: 'Fashion' },
    { value: 'Beauty', label: 'Beauty' },
    { value: 'Fitness', label: 'Fitness' },
    { value: 'Travel', label: 'Travel' },
    { value: 'Food', label: 'Food' },
    { value: 'Tech', label: 'Tech' },
    { value: 'Gaming', label: 'Gaming' },
    { value: 'Lifestyle', label: 'Lifestyle' },
    { value: 'Parenting', label: 'Parenting' },
    { value: 'Finance', label: 'Finance' }
  ];

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Email is invalid';
    if (!formData.password) newErrors.password = 'Password is required';
    else if (formData.password.length < 8) newErrors.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(formData.password)) newErrors.password = 'Password must contain at least one uppercase letter';
    else if (!/[0-9]/.test(formData.password)) newErrors.password = 'Password must contain at least one number';
    if (!formData.confirmPassword) newErrors.confirmPassword = 'Please confirm your password';
    else if (formData.password !== formData.confirmPassword) newErrors.confirmPassword = 'Passwords do not match';
    if (!formData.fullName) newErrors.fullName = 'Full name is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    if (userType === 'brand') {
      if (!formData.brandName) newErrors.brandName = 'Brand name is required';
      if (!formData.industry) newErrors.industry = 'Industry is required';
    } else {
      if (!formData.displayName) newErrors.displayName = 'Display name is required';
      if (!formData.handle) newErrors.handle = 'Handle is required';
      if (!formData.niche) newErrors.niche = 'Please select a niche';
    }
    if (!captchaToken) newErrors.captcha = 'Please verify reCAPTCHA';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailOTP = async () => {
    if (!formData.email) { toast.error('Email is required'); return; }
    const result = await sendEmailOTP(formData.email);
    if (result.success) {
      setOtpDestination(formData.email);
      setOtpType('email');
      setShowOTP(true);
    }
  };

  const handlePhoneOTP = async () => {
    if (!formData.phone) { toast.error('Please enter phone number'); return; }
    
    const formattedPhone = formatPhoneNumber(formData.phone);
    
    // Basic validation for international format
    if (!/^\+?[1-9]\d{1,14}$/.test(formattedPhone.replace(/[\s-]/g, ''))) {
      toast.error('Please enter a valid phone number');
      return;
    }
    
    const result = await sendPhoneOTP(formattedPhone);
    if (result.success) {
      setOtpDestination(formattedPhone);
      setOtpType('phone');
      setShowOTP(true);
    }
  };

  const handleVerifyOTP = async (code) => {
    let result;
    if (otpType === 'email') result = await verifyEmailOTP(otpDestination, code);
    else result = await verifyPhoneOTP(otpDestination, code);
    if (result.success) { setShowOTP(false); setStep(3); }
  };

  const handleResendOTP = async () => {
    if (otpType === 'email') await sendEmailOTP(otpDestination);
    else await sendPhoneOTP(otpDestination);
  };

  const handleCaptchaChange = (token) => {
    setCaptchaToken(token);
    if (errors.captcha) setErrors(prev => ({ ...prev, captcha: null }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (step === 1) {
      if (validateStep1()) setStep(2);
    } else if (step === 2) {
      if (validateStep2()) handleEmailOTP();
    } else {
      setLoading(true);
      
      
      const signupData = {
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        userType,
        phone: formatPhoneNumber(formData.phone),
        captchaToken,
      };
      if (userType === 'brand') {
        signupData.brandName = formData.brandName;
        signupData.industry = formData.industry;
        signupData.website = formData.website || '';
      } else {
        signupData.displayName = formData.displayName;
        const cleanHandle = formData.handle.startsWith('@') ? formData.handle.substring(1) : formData.handle;
        signupData.handle = cleanHandle;
        signupData.niches = formData.niche ? [formData.niche] : [];
      }
      try {
        const result = await signup(signupData);
        if (result.success) {
          navigate(userType === 'brand' ? '/brand/dashboard' : '/creator/dashboard');
        }
      } catch (error) {
        console.error('Signup error:', error);
        if (captchaRef.current) { captchaRef.current.reset(); setCaptchaToken(null); }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: null }));
  };

  if (showOTP) {
    return (
      <OTPVerification
        type={otpType}
        destination={otpDestination}
        onVerify={handleVerifyOTP}
        onResend={handleResendOTP}
        onBack={() => setShowOTP(false)}
        loading={authLoading}
      />
    );
  }

  const stepLabels = ['Account Info', 'Profile Details', 'Verification'];

  return (
    <>
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: '#000000',
        }}
      >
        <div className="w-full p-4 sm:p-6 md:p-8" style={{ maxWidth: 520 }}>
        {/* mobile logo */}
        <div className="flex lg:hidden items-center gap-2 mb-8">
          <div
            style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#1a1a1a',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Shield className="text-white" size={18} />
          </div>
          <span
            style={{
              fontSize: 18, fontWeight: 700,
              color: '#111827',
            }}
          >
            InfluenceX
          </span>
        </div>

        {/* heading */}
        <div className="mb-8">
          <h2
            style={{
              fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px',
              color: '#ffffff', marginBottom: 8,
            }}
          >
            Create Account
          </h2>
          <p style={{ color: '#cccccc', fontSize: 15, lineHeight: 1.5 }}>
            Already have an account?{' '}
            <Link
              to="/login"
              style={{ fontWeight: 700, color: '#ffffff', textDecoration: 'none' }}
              onMouseEnter={(e) => { e.target.style.color = '#cccccc'; }}
              onMouseLeave={(e) => { e.target.style.color = '#ffffff'; }}
            >
              Sign in
            </Link>
          </p>
        </div>

        {/* Step progress bar */}
        <div className="mb-8">
          <div style={{ display: 'flex', gap: 0, marginBottom: 8 }}>
            {[1, 2, 3].map(s => (
              <div
                key={s}
                style={{
                  flex: 1,
                  height: 4,
                  background: step >= s ? '#ffffff' : '#333333',
                  borderRadius: s === 1 ? '10px 0 0 10px' : s === 3 ? '0 10px 10px 0' : '0',
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            {stepLabels.map((lbl, i) => (
              <span
                key={lbl}
                style={{
                  fontSize: 11,
                  color: step >= i + 1 ? '#ffffff' : '#cccccc',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.4px',
                }}
              >
                {lbl}
              </span>
            ))}
          </div>
        </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Step 1: Basic Account Information */}
            {step === 1 && (
              <>
                {/* ── Full Name (Full width) ── */}
                <div className="lg:col-span-2">
                  <label
                    style={{
                      display: 'block', fontSize: 13, fontWeight: 600,
                      color: '#ffffff', marginBottom: 8,
                    }}
                  >
                    Full Name
                  </label>
                  <div style={{ position: 'relative' }}>
                    <User
                      size={16}
                      style={{
                        position: 'absolute', left: 14, top: '50%',
                        transform: 'translateY(-50%)',
                        color: errors.fullName ? '#ef4444' : '#9ca3af',
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Enter your full name"
                      value={formData.fullName}
                      name="fullName"
                      onChange={handleChange}
                      style={{
                        width: '100%',
                        padding: '14px 16px 14px 44px',
                        borderRadius: 12,
                        border: `1.5px solid ${errors.fullName ? '#ef4444' : '#333333'}`,
                        background: '#1a1a1a',
                        color: '#ffffff',
                        fontSize: 15,
                        outline: 'none',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box',
                      }}
                      onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                      onBlur={(e) => { e.target.style.borderColor = errors.fullName ? '#ef4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                    />
                  </div>
                  {errors.fullName && (
                    <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.fullName}</p>
                  )}
                </div>

                {/* ── Email and Phone (Side by side on desktop) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Email */}
                  <div>
                    <label
                      style={{
                        display: 'block', fontSize: 13, fontWeight: 600,
                        color: '#ffffff', marginBottom: 8,
                      }}
                    >
                      Email address
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Mail
                        size={16}
                        style={{
                          position: 'absolute', left: 14, top: '50%',
                          transform: 'translateY(-50%)',
                          color: errors.email ? '#ef4444' : '#9ca3af',
                        }}
                      />
                      <input
                        type="email"
                        placeholder="you@example.com"
                        value={formData.email}
                        name="email"
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '14px 16px 14px 44px',
                          borderRadius: 12,
                          border: `1.5px solid ${errors.email ? '#ef4444' : '#333333'}`,
                          background: '#1a1a1a',
                          color: '#ffffff',
                          fontSize: 15,
                          outline: 'none',
                          transition: 'all 0.2s ease',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                        onBlur={(e) => { e.target.style.borderColor = errors.email ? '#ef4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                      />
                    </div>
                    {errors.email && (
                      <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.email}</p>
                    )}
                  </div>

                  {/* Phone */}
                  <div>
                    <label
                      style={{
                        display: 'block', fontSize: 13, fontWeight: 600,
                        color: '#ffffff', marginBottom: 8,
                      }}
                    >
                      Phone Number
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Phone
                        size={16}
                        style={{
                          position: 'absolute', left: 14, top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#9ca3af',
                        }}
                      />
                      <input
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={formData.phone}
                        name="phone"
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '14px 16px 14px 44px',
                          borderRadius: 12,
                          border: '1.5px solid #333333',
                          background: '#1a1a1a',
                          color: '#ffffff',
                          fontSize: 15,
                          outline: 'none',
                          transition: 'all 0.2s ease',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                        onBlur={(e) => { e.target.style.borderColor = '#333333'; e.target.style.background = '#1a1a1a'; }}
                      />
                    </div>
                  </div>
                </div>

                {/* ── Password and Confirm Password (Side by side on desktop) ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Password */}
                  <div>
                    <label
                      style={{
                        display: 'block', fontSize: 13, fontWeight: 600,
                        color: '#ffffff', marginBottom: 8,
                      }}
                    >
                      Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock
                        size={16}
                        style={{
                          position: 'absolute', left: 14, top: '50%',
                          transform: 'translateY(-50%)',
                          color: errors.password ? '#ef4444' : '#9ca3af',
                        }}
                      />
                      <input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Create a password"
                        value={formData.password}
                        name="password"
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '14px 48px 14px 44px',
                          borderRadius: 12,
                          border: `1.5px solid ${errors.password ? '#ef4444' : '#333333'}`,
                          background: '#1a1a1a',
                          color: '#ffffff',
                          fontSize: 15,
                          outline: 'none',
                          transition: 'all 0.2s ease',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                        onBlur={(e) => { e.target.style.borderColor = errors.password ? '#ef4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute', right: 16, top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          color: '#9ca3af',
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.password && (
                      <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.password}</p>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div>
                    <label
                      style={{
                        display: 'block', fontSize: 13, fontWeight: 600,
                        color: '#ffffff', marginBottom: 8,
                      }}
                    >
                      Confirm Password
                    </label>
                    <div style={{ position: 'relative' }}>
                      <Lock
                        size={16}
                        style={{
                          position: 'absolute', left: 14, top: '50%',
                          transform: 'translateY(-50%)',
                          color: errors.confirmPassword ? '#ef4444' : '#9ca3af',
                        }}
                      />
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        placeholder="Confirm your password"
                        value={formData.confirmPassword}
                        name="confirmPassword"
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '14px 48px 14px 44px',
                          borderRadius: 12,
                          border: `1.5px solid ${errors.confirmPassword ? '#ef4444' : '#333333'}`,
                          background: '#1a1a1a',
                          color: '#ffffff',
                          fontSize: 15,
                          outline: 'none',
                          transition: 'all 0.2s ease',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                        onBlur={(e) => { e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute', right: 16, top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                          color: '#9ca3af',
                        }}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Step 2: Profile Details */}
            {step === 2 && (
              <>
                <div>
                  <label
                    style={{
                      display: 'block', fontSize: 12, fontWeight: 700,
                      letterSpacing: '0.08em', textTransform: 'uppercase',
                      color: '#ffffff', marginBottom: 12,
                    }}
                  >
                    Sign up as
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    {/* Brand */}
                    <button
                      type="button"
                      onClick={() => setUserType('brand')}
                      style={{
                        padding: '20px 16px',
                        borderRadius: 12,
                        border: userType === 'brand'
                          ? '2px solid #ffffff'
                          : '2px solid #333333',
                        background: userType === 'brand'
                          ? '#1a1a1a'
                          : '#000000',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: userType === 'brand'
                            ? '#ffffff'
                            : '#333333',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.18s ease',
                        }}
                      >
                        <Building2
                          size={16}
                          style={{ color: userType === 'brand' ? '#000000' : '#ffffff' }}
                        />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p
                          style={{
                            fontSize: 14, fontWeight: 600,
                            color: userType === 'brand'
                              ? '#ffffff'
                              : '#ffffff',
                          }}
                        >
                          Brand
                        </p>
                        <p style={{ fontSize: 11, color: '#cccccc', marginTop: 2 }}>
                          Find creators
                        </p>
                      </div>
                    </button>

                    {/* Creator */}
                    <button
                      type="button"
                      onClick={() => setUserType('creator')}
                      style={{
                        padding: '20px 16px',
                        borderRadius: 12,
                        border: userType === 'creator'
                          ? '2px solid #ffffff'
                          : '2px solid #333333',
                        background: userType === 'creator'
                          ? '#1a1a1a'
                          : '#000000',
                        cursor: 'pointer',
                        transition: 'all 0.18s ease',
                        display: 'flex', flexDirection: 'column',
                        alignItems: 'center', gap: 10,
                      }}
                    >
                      <div
                        style={{
                          width: 32, height: 32, borderRadius: 10,
                          background: userType === 'creator'
                            ? '#ffffff'
                            : '#333333',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          transition: 'all 0.18s ease',
                        }}
                      >
                        <Sparkles
                          size={18}
                          style={{ color: userType === 'creator' ? '#000000' : '#ffffff' }}
                        />
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <p
                          style={{
                            fontSize: 14, fontWeight: 600,
                            color: userType === 'creator'
                              ? '#ffffff'
                              : '#ffffff',
                          }}
                        >
                          Creator
                        </p>
                        <p style={{ fontSize: 11, color: '#cccccc', marginTop: 2 }}>
                          Monetize audience
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

            {/* Brand specific fields */}
                {userType === 'brand' && (
                  <>
                    {/* ── Brand Name and Industry (Side by side on desktop) ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Brand Name */}
                      <div>
                        <label
                          style={{
                            display: 'block', fontSize: 13, fontWeight: 600,
                            color: '#ffffff', marginBottom: 8,
                          }}
                        >
                          Brand Name
                        </label>
                        <input
                          type="text"
                          placeholder="Enter your brand name"
                          value={formData.brandName}
                          name="brandName"
                          onChange={handleChange}
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            borderRadius: 12,
                            border: `1.5px solid ${errors.brandName ? '#ef4444' : '#333333'}`,
                            background: '#1a1a1a',
                            color: '#ffffff',
                            fontSize: 15,
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                          onBlur={(e) => { e.target.style.borderColor = errors.brandName ? '#ef4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                        />
                        {errors.brandName && (
                          <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.brandName}</p>
                        )}
                      </div>

                      {/* Industry */}
                      <div>
                        <label
                          style={{
                            display: 'block', fontSize: 13, fontWeight: 600,
                            color: '#ffffff', marginBottom: 8,
                          }}
                        >
                          Industry
                        </label>
                        <select
                          value={formData.industry}
                          name="industry"
                          onChange={handleChange}
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            borderRadius: 12,
                            border: `1.5px solid ${errors.industry ? '#ef4444' : '#333333'}`,
                            background: '#1a1a1a',
                            color: '#ffffff',
                            fontSize: 15,
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                          onBlur={(e) => { e.target.style.borderColor = errors.industry ? '#ef4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                        >
                          <option value="">Select industry</option>
                          {brandIndustries.map(i => (
                            <option key={i.value} value={i.value}>{i.label}</option>
                          ))}
                        </select>
                        {errors.industry && (
                          <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.industry}</p>
                        )}
                      </div>
                    </div>

                    {/* ── Website (Full width) ── */}
                    <div>
                      <label
                        style={{
                          display: 'block', fontSize: 13, fontWeight: 600,
                          color: '#ffffff', marginBottom: 8,
                        }}
                      >
                        Website
                      </label>
                      <div style={{ position: 'relative' }}>
                        <Globe
                          size={16}
                          style={{
                            position: 'absolute', left: 14, top: '50%',
                            transform: 'translateY(-50%)',
                            color: '#9ca3af',
                          }}
                        />
                        <input
                          type="url"
                          placeholder="https://www.yourbrand.com"
                          value={formData.website}
                          name="website"
                          onChange={handleChange}
                          style={{
                            width: '100%',
                            padding: '14px 16px 14px 44px',
                            borderRadius: 12,
                            border: '1.5px solid #333333',
                            background: '#1a1a1a',
                            color: '#ffffff',
                            fontSize: 15,
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                          onBlur={(e) => { e.target.style.borderColor = '#333333'; e.target.style.background = '#1a1a1a'; }}
                        />
                      </div>
                    </div>
                  </>
                )}

                {/* Creator specific fields */}
                {userType === 'creator' && (
                  <>
                    {/* ── Display Name and Handle (Side by side on desktop) ── */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      {/* Display Name */}
                      <div>
                        <label
                          style={{
                            display: 'block', fontSize: 13, fontWeight: 600,
                            color: '#ffffff', marginBottom: 8,
                          }}
                        >
                          Display Name
                        </label>
                        <input
                          type="text"
                          placeholder="How should brands address you?"
                          value={formData.displayName}
                          name="displayName"
                          onChange={handleChange}
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            borderRadius: 12,
                            border: `1.5px solid ${errors.displayName ? '#ef4444' : '#333333'}`,
                            background: '#1a1a1a',
                            color: '#ffffff',
                            fontSize: 15,
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                          onBlur={(e) => { e.target.style.borderColor = errors.displayName ? '#ef4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                        />
                        {errors.displayName && (
                          <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.displayName}</p>
                        )}
                      </div>

                      {/* Handle */}
                      <div>
                        <label
                          style={{
                            display: 'block', fontSize: 13, fontWeight: 600,
                            color: '#ffffff', marginBottom: 8,
                          }}
                        >
                          Handle
                        </label>
                        <input
                          type="text"
                          placeholder="username (without @)"
                          value={formData.handle}
                          name="handle"
                          onChange={handleChange}
                          style={{
                            width: '100%',
                            padding: '14px 16px',
                            borderRadius: 12,
                            border: `1.5px solid ${errors.handle ? '#ef4444' : '#333333'}`,
                            background: '#1a1a1a',
                            color: '#ffffff',
                            fontSize: 15,
                            outline: 'none',
                            transition: 'all 0.2s ease',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                          onBlur={(e) => { e.target.style.borderColor = errors.handle ? '#ef4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                        />
                        {errors.handle && (
                          <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.handle}</p>
                        )}
                      </div>
                    </div>

                    {/* ── Primary Niche (Full width) ── */}
                    <div>
                      <label
                        style={{
                          display: 'block', fontSize: 13, fontWeight: 600,
                          color: '#ffffff', marginBottom: 8,
                        }}
                      >
                        Primary Niche
                      </label>
                      <select
                        value={formData.niche}
                        name="niche"
                        onChange={handleChange}
                        style={{
                          width: '100%',
                          padding: '14px 16px',
                          borderRadius: 12,
                          border: `1.5px solid ${errors.niche ? '#ef4444' : '#333333'}`,
                          background: '#1a1a1a',
                          color: '#ffffff',
                          fontSize: 15,
                          outline: 'none',
                          transition: 'all 0.2s ease',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#ffffff'; e.target.style.background = '#000000'; }}
                        onBlur={(e) => { e.target.style.borderColor = errors.niche ? '#ef4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                      >
                        <option value="">Select your niche</option>
                        {creatorNiches.map(n => (
                          <option key={n.value} value={n.value}>{n.label}</option>
                        ))}
                      </select>
                      {errors.niche && (
                        <p style={{ marginTop: 6, fontSize: 12, color: '#ef4444' }}>{errors.niche}</p>
                      )}
                    </div>
                  </>
                )}

                {/* ── reCAPTCHA ── */}
                {RECAPTCHA_SITE_KEY ? (
                  <div
                    style={{
                      padding: '16px 18px',
                      borderRadius: 12,
                      border: `1.5px solid ${errors.captcha ? '#ef4444' : '#333333'}`,
                      background: '#1a1a1a',
                    }}
                  >
                    <ReCAPTCHA
                      ref={captchaRef}
                      sitekey={RECAPTCHA_SITE_KEY}
                      onChange={handleCaptchaChange}
                    />
                    {errors.captcha && (
                      <p style={{ marginTop: 8, fontSize: 12, color: '#ef4444' }}>{errors.captcha}</p>
                    )}
                  </div>
                ) : (
                  <div style={{ padding: '12px 16px', background: '#1a1a1a', border: '1.5px solid #333333', borderRadius: 12 }}>
                    <p style={{ fontSize: 12, color: '#9ca3af' }}>⚠️ reCAPTCHA not configured. Set VITE_RECAPTCHA_SITE_KEY in .env</p>
                  </div>
                )}
              </>
            )}

            {step === 3 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div
                  style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #ffffff, #cccccc)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 18px',
                    boxShadow: '0 8px 24px rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <CheckCircle size={38} color="#ffffff" />
                </div>
                <div
                  style={{
                    fontSize: 20, fontWeight: 700,
                    color: '#ffffff', marginBottom: 10,
                  }}
                >
                  Almost there!
                </div>
                <p style={{ fontSize: 14, color: '#ffffff', lineHeight: 1.6, marginBottom: 14 }}>
                  We've sent a verification code to your email.<br />
                  Please check your inbox and verify your email address.
                </p>
                {formData.phone && (
                  <button
                    type="button"
                    onClick={handlePhoneOTP}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#ffffff',
                      fontSize: 13,
                      fontWeight: 700,
                      cursor: 'pointer',
                      textDecoration: 'underline',
                    }}
                  >
                    Also verify phone number (optional)
                  </button>
                )}
              </div>
            )}

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading || authLoading || (step === 2 && !captchaToken)}
              style={{
                width: '100%',
                padding: '16px 24px',
                borderRadius: 12,
                border: 'none',
                background: (loading || authLoading || (step === 2 && !captchaToken))
                  ? '#444444'
                  : 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)',
                color: '#000000',
                fontSize: 16,
                fontWeight: 700,
                cursor: (loading || authLoading || (step === 2 && !captchaToken)) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all 0.3s ease',
                letterSpacing: '0.01em',
                marginTop: 8,
              }}
              onMouseEnter={(e) => { 
                if (!loading && !authLoading && !(step === 2 && !captchaToken)) {
                  e.target.style.background = 'linear-gradient(135deg, #f0f0f0 0%, #d0d0d0 100%)';
                  e.target.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => { 
                e.target.style.background = (loading || authLoading || (step === 2 && !captchaToken))
                  ? '#444444'
                  : 'linear-gradient(135deg, #ffffff 0%, #e0e0e0 100%)';
                e.target.style.transform = 'translateY(0px)';
              }}
            >
              {loading || authLoading ? (
                <div
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: '2px solid rgba(0,0,0,0.3)',
                    borderTopColor: '#000',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
              ) : (
                <>
                  {step === 1 ? 'Continue' : step === 2 ? 'Create Account' : 'Go to Dashboard'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>

            {/* ── Footer links ── */}
            <p style={{ textAlign: 'center', fontSize: 14, color: '#cccccc', marginTop: 16 }}>
              Already have an account?{' '}
              <Link
                to="/login"
                style={{ fontWeight: 700, color: '#ffffff', textDecoration: 'none' }}
                onMouseEnter={(e) => { e.target.style.color = '#cccccc'; }}
                onMouseLeave={(e) => { e.target.style.color = '#ffffff'; }}
              >
                Sign in
              </Link>
            </p>

            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, paddingTop: 8,
              }}
            >
              <Shield size={12} style={{ color: '#9ca3af' }} />
              <span style={{ fontSize: 12, color: '#9ca3af' }}>
                Your information is secure and encrypted
              </span>
            </div>

          </form>

        </div>
      </div>
    </>
  );
};

export default Signup;