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
    const result = await sendPhoneOTP(formData.phone);
    if (result.success) {
      setOtpDestination(formData.phone);
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
        phone: formData.phone || '',
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
          toast.success('Account created successfully!');
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

  const stepLabels = ['Basic Info', 'Details', 'Verification'];

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      {/* ── Left decorative panel ── */}
      <div className="hidden lg:flex lg:w-1/2 relative flex-col justify-between p-12 overflow-hidden">
        {/* floating blobs */}
        <div
          style={{
            position: 'absolute', width: 340, height: 340, borderRadius: '50%',
            background: 'rgba(255,255,255,0.08)', top: -80, left: -80,
          }}
        />
        <div
          style={{
            position: 'absolute', width: 220, height: 220, borderRadius: '50%',
            background: 'rgba(255,255,255,0.06)', bottom: 80, right: -40,
          }}
        />
        <div
          style={{
            position: 'absolute', width: 140, height: 140, borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)', top: '45%', left: '60%',
          }}
        />

        {/* brand mark */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div
              style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'rgba(255,255,255,0.2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backdropFilter: 'blur(8px)',
              }}
            >
              <Shield className="text-white" size={22} />
            </div>
            <span style={{ color: '#fff', fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px' }}>
              InfluenceX
            </span>
          </div>
        </div>

        {/* hero copy */}
        <div className="relative z-10">
          <h1
            style={{
              color: '#fff', fontSize: 42, fontWeight: 800,
              lineHeight: 1.15, letterSpacing: '-1px', marginBottom: 20,
            }}
          >
            Connect brands<br />with creators.
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 17, lineHeight: 1.7, maxWidth: 360 }}>
           join thousand of brands and creators collaborating on impactful campaigns 
          </p>

          {/* stats row */}
          <div className="flex gap-10 mt-10">
            {[
              { n: '12K+', label: 'Creators' },
              { n: '3K+', label: 'Brands' },
              { n: '98%', label: 'Satisfaction' },
            ].map(({ n, label }) => (
              <div key={label}>
                <p style={{ color: '#fff', fontSize: 26, fontWeight: 800 }}>{n}</p>
                <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13 }}>{label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* bottom tag */}
        <div
          className="relative z-10 flex items-center gap-2"
          style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13 }}
        >
          <Shield size={13} />
          <span>Your data is always secure and encrypted</span>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div
        className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-10"
        style={{
          background: '#fff',
          borderRadius: '0',
        }}
      >
        <div className="w-full" style={{ maxWidth: 420 }}>

          {/* mobile logo */}
          <div className="flex lg:hidden items-center gap-2 mb-8">
            <div
              style={{
                width: 36, height: 36, borderRadius: 10,
                background: 'linear-gradient(135deg,#667eea,#764ba2)',
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
                fontSize: 30, fontWeight: 800, letterSpacing: '-0.5px',
                color: '#111827', marginBottom: 6,
              }}
            >
              Create Account
            </h2>
            <p style={{ color: '#6b7280', fontSize: 15 }}>
              Already have an account?{' '}
              <Link
                to="/login"
                style={{ fontWeight: 700, color: '#667eea', textDecoration: 'none' }}
              >
                Sign in
              </Link>
            </p>
          </div>

          {/* Step progress bar */}
          <div className="mb-6">
            <div style={{ display: 'flex', gap: 0, marginBottom: 8 }}>
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  style={{
                    flex: 1,
                    height: 4,
                    background: step >= s ? 'linear-gradient(90deg, #667eea, #764ba2)' : '#e5e7eb',
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
                    color: step >= i + 1 ? '#667eea' : '#9ca3af',
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

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* ── Account type selector ── */}
            <div>
              <label
                style={{
                  display: 'block', fontSize: 11, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: '#9ca3af', marginBottom: 10,
                }}
              >
                Sign up as
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Brand */}
                <button
                  type="button"
                  onClick={() => setUserType('brand')}
                  style={{
                    padding: '14px 12px',
                    borderRadius: 12,
                    border: userType === 'brand'
                      ? '2px solid #667eea'
                      : '2px solid #e5e7eb',
                    background: userType === 'brand'
                      ? '#f5f3ff'
                      : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: userType === 'brand'
                        ? 'linear-gradient(135deg,#667eea,#764ba2)'
                        : '#f3f4f6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <Building2
                      size={18}
                      style={{ color: userType === 'brand' ? '#fff' : '#6b7280' }}
                    />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p
                      style={{
                        fontSize: 14, fontWeight: 600,
                        color: userType === 'brand'
                          ? '#667eea'
                          : '#374151',
                      }}
                    >
                      Brand
                    </p>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                      Find creators
                    </p>
                  </div>
                </button>

                {/* Creator */}
                <button
                  type="button"
                  onClick={() => setUserType('creator')}
                  style={{
                    padding: '14px 12px',
                    borderRadius: 12,
                    border: userType === 'creator'
                      ? '2px solid #667eea'
                      : '2px solid #e5e7eb',
                    background: userType === 'creator'
                      ? '#f5f3ff'
                      : '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 38, height: 38, borderRadius: 10,
                      background: userType === 'creator'
                        ? 'linear-gradient(135deg,#667eea,#764ba2)'
                        : '#f3f4f6',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <Sparkles
                      size={18}
                      style={{ color: userType === 'creator' ? '#fff' : '#6b7280' }}
                    />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p
                      style={{
                        fontSize: 14, fontWeight: 600,
                        color: userType === 'creator'
                          ? '#667eea'
                          : '#374151',
                      }}
                    >
                      Creator
                    </p>
                    <p style={{ fontSize: 11, color: '#9ca3af', marginTop: 1 }}>
                      Monetize audience
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* ── Full Name ── */}
            <div>
              <label
                style={{
                  display: 'block', fontSize: 13, fontWeight: 600,
                  color: '#374151', marginBottom: 6,
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
                    padding: '12px 14px 12px 40px',
                    borderRadius: 10,
                    border: `1.5px solid ${errors.fullName ? '#ef4444' : '#e5e7eb'}`,
                    background: '#f9fafb',
                    color: '#111827',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.fullName ? '#ef4444' : '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                />
              </div>
              {errors.fullName && (
                <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.fullName}</p>
              )}
            </div>

            {/* ── Email ── */}
            <div>
              <label
                style={{
                  display: 'block', fontSize: 13, fontWeight: 600,
                  color: '#374151', marginBottom: 6,
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
                    padding: '12px 14px 12px 40px',
                    borderRadius: 10,
                    border: `1.5px solid ${errors.email ? '#ef4444' : '#e5e7eb'}`,
                    background: '#f9fafb',
                    color: '#111827',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.email ? '#ef4444' : '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                />
              </div>
              {errors.email && (
                <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.email}</p>
              )}
            </div>

            {/* ── Phone ── */}
            <div>
              <label
                style={{
                  display: 'block', fontSize: 13, fontWeight: 600,
                  color: '#374151', marginBottom: 6,
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
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  name="phone"
                  onChange={handleChange}
                  style={{
                    width: '100%',
                    padding: '12px 14px 12px 40px',
                    borderRadius: 10,
                    border: '1.5px solid #e5e7eb',
                    background: '#f9fafb',
                    color: '#111827',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                />
              </div>
            </div>

            {/* ── Password ── */}
            <div>
              <label
                style={{
                  display: 'block', fontSize: 13, fontWeight: 600,
                  color: '#374151', marginBottom: 6,
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
                    padding: '12px 44px 12px 40px',
                    borderRadius: 10,
                    border: `1.5px solid ${errors.password ? '#ef4444' : '#e5e7eb'}`,
                    background: '#f9fafb',
                    color: '#111827',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.password ? '#ef4444' : '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: '#9ca3af',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && (
                <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.password}</p>
              )}
            </div>

            {/* ── Confirm Password ── */}
            <div>
              <label
                style={{
                  display: 'block', fontSize: 13, fontWeight: 600,
                  color: '#374151', marginBottom: 6,
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
                    padding: '12px 44px 12px 40px',
                    borderRadius: 10,
                    border: `1.5px solid ${errors.confirmPassword ? '#ef4444' : '#e5e7eb'}`,
                    background: '#f9fafb',
                    color: '#111827',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.background = '#fff'; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.confirmPassword ? '#ef4444' : '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: '#9ca3af',
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.confirmPassword && (
                <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.confirmPassword}</p>
              )}
            </div>

            {step === 2 && (
              <>
                {userType === 'brand' ? (
                  <>
                    {/* ── Brand Name ── */}
                    <div>
                      <label
                        style={{
                          display: 'block', fontSize: 13, fontWeight: 600,
                          color: '#374151', marginBottom: 6,
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
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: `1.5px solid ${errors.brandName ? '#ef4444' : '#e5e7eb'}`,
                          background: '#f9fafb',
                          color: '#111827',
                          fontSize: 14,
                          outline: 'none',
                          transition: 'border-color 0.15s',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.background = '#fff'; }}
                        onBlur={(e) => { e.target.style.borderColor = errors.brandName ? '#ef4444' : '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                      />
                      {errors.brandName && (
                        <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.brandName}</p>
                      )}
                    </div>

                    {/* ── Industry ── */}
                    <div>
                      <label
                        style={{
                          display: 'block', fontSize: 13, fontWeight: 600,
                          color: '#374151', marginBottom: 6,
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
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: `1.5px solid ${errors.industry ? '#ef4444' : '#e5e7eb'}`,
                          background: '#f9fafb',
                          color: '#111827',
                          fontSize: 14,
                          outline: 'none',
                          transition: 'border-color 0.15s',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.background = '#fff'; }}
                        onBlur={(e) => { e.target.style.borderColor = errors.industry ? '#ef4444' : '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                      >
                        <option value="">Select industry</option>
                        {brandIndustries.map(i => (
                          <option key={i.value} value={i.value}>{i.label}</option>
                        ))}
                      </select>
                      {errors.industry && (
                        <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.industry}</p>
                      )}
                    </div>

                    {/* ── Website ── */}
                    <div>
                      <label
                        style={{
                          display: 'block', fontSize: 13, fontWeight: 600,
                          color: '#374151', marginBottom: 6,
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
                            padding: '12px 14px 12px 40px',
                            borderRadius: 10,
                            border: '1.5px solid #e5e7eb',
                            background: '#f9fafb',
                            color: '#111827',
                            fontSize: 14,
                            outline: 'none',
                            transition: 'border-color 0.15s',
                            boxSizing: 'border-box',
                          }}
                          onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.background = '#fff'; }}
                          onBlur={(e) => { e.target.style.borderColor = '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                        />
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {/* ── Display Name ── */}
                    <div>
                      <label
                        style={{
                          display: 'block', fontSize: 13, fontWeight: 600,
                          color: '#374151', marginBottom: 6,
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
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: `1.5px solid ${errors.displayName ? '#ef4444' : '#e5e7eb'}`,
                          background: '#f9fafb',
                          color: '#111827',
                          fontSize: 14,
                          outline: 'none',
                          transition: 'border-color 0.15s',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.background = '#fff'; }}
                        onBlur={(e) => { e.target.style.borderColor = errors.displayName ? '#ef4444' : '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                      />
                      {errors.displayName && (
                        <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.displayName}</p>
                      )}
                    </div>

                    {/* ── Handle ── */}
                    <div>
                      <label
                        style={{
                          display: 'block', fontSize: 13, fontWeight: 600,
                          color: '#374151', marginBottom: 6,
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
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: `1.5px solid ${errors.handle ? '#ef4444' : '#e5e7eb'}`,
                          background: '#f9fafb',
                          color: '#111827',
                          fontSize: 14,
                          outline: 'none',
                          transition: 'border-color 0.15s',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.background = '#fff'; }}
                        onBlur={(e) => { e.target.style.borderColor = errors.handle ? '#ef4444' : '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                      />
                      {errors.handle && (
                        <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.handle}</p>
                      )}
                    </div>

                    {/* ── Primary Niche ── */}
                    <div>
                      <label
                        style={{
                          display: 'block', fontSize: 13, fontWeight: 600,
                          color: '#374151', marginBottom: 6,
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
                          padding: '12px 14px',
                          borderRadius: 10,
                          border: `1.5px solid ${errors.niche ? '#ef4444' : '#e5e7eb'}`,
                          background: '#f9fafb',
                          color: '#111827',
                          fontSize: 14,
                          outline: 'none',
                          transition: 'border-color 0.15s',
                          boxSizing: 'border-box',
                        }}
                        onFocus={(e) => { e.target.style.borderColor = '#667eea'; e.target.style.background = '#fff'; }}
                        onBlur={(e) => { e.target.style.borderColor = errors.niche ? '#ef4444' : '#e5e7eb'; e.target.style.background = '#f9fafb'; }}
                      >
                        <option value="">Select your niche</option>
                        {creatorNiches.map(n => (
                          <option key={n.value} value={n.value}>{n.label}</option>
                        ))}
                      </select>
                      {errors.niche && (
                        <p style={{ marginTop: 5, fontSize: 12, color: '#ef4444' }}>{errors.niche}</p>
                      )}
                    </div>
                  </>
                )}

                {/* ── reCAPTCHA ── */}
                {RECAPTCHA_SITE_KEY ? (
                  <div
                    style={{
                      padding: '14px 16px',
                      borderRadius: 10,
                      border: `1.5px solid ${errors.captcha ? '#ef4444' : '#e5e7eb'}`,
                      background: '#f9fafb',
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
                  <div style={{ padding: '10px 14px', background: '#fffbeb', border: '1.5px solid #fde68a', borderRadius: 10 }}>
                    <p style={{ fontSize: 12, color: '#92400e' }}>⚠️ reCAPTCHA not configured. Set VITE_RECAPTCHA_SITE_KEY in .env</p>
                  </div>
                )}
              </>
            )}

            {step === 3 && (
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <div
                  style={{
                    width: 80, height: 80, borderRadius: '50%',
                    background: 'linear-gradient(135deg, #d0f4ff, #e0fbff)',
                    border: '3px solid #667eea',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    margin: '0 auto 18px',
                    boxShadow: '0 8px 24px rgba(102, 126, 234, 0.2)',
                  }}
                >
                  <CheckCircle size={38} color="#667eea" />
                </div>
                <div
                  style={{
                    fontSize: 20, fontWeight: 700,
                    color: '#111827', marginBottom: 10,
                  }}
                >
                  Almost there!
                </div>
                <p style={{ fontSize: 14, color: '#6b7280', lineHeight: 1.6, marginBottom: 14 }}>
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
                      color: '#667eea',
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
                padding: '13px 20px',
                borderRadius: 10,
                border: 'none',
                background: (loading || authLoading || (step === 2 && !captchaToken))
                  ? '#a5b4fc'
                  : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontSize: 15,
                fontWeight: 700,
                cursor: (loading || authLoading || (step === 2 && !captchaToken)) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.2s, transform 0.1s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => { if (!loading && !authLoading && !(step === 2 && !captchaToken)) e.target.style.opacity = '0.92'; }}
              onMouseLeave={(e) => { e.target.style.opacity = '1'; }}
            >
              {loading || authLoading ? (
                <div
                  style={{
                    width: 20, height: 20, borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    animation: 'spin 0.7s linear infinite',
                  }}
                />
              ) : (
                <>
                  {step === 1 ? 'Continue' : step === 2 ? 'Create Account' : 'Go to Dashboard'}
                  <ArrowRight size={17} />
                </>
              )}
            </button>

            {/* ── Footer links ── */}
            <p style={{ textAlign: 'center', fontSize: 14, color: '#6b7280' }}>
              Already have an account?{' '}
              <Link
                to="/login"
                style={{ fontWeight: 700, color: '#667eea', textDecoration: 'none' }}
              >
                Sign in
              </Link>
            </p>

            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, paddingTop: 4,
              }}
            >
              <Shield size={11} style={{ color: '#d1d5db' }} />
              <span style={{ fontSize: 11, color: '#9ca3af' }}>
                Your information is secure and encrypted
              </span>
            </div>

          </form>
        </div>
      </div>

      {/* spin keyframe injected inline */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        input::placeholder { color: #9ca3af; }
      `}</style>
    </div>
  );
};

export default Signup;