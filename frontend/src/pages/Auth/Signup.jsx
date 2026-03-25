import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ReCAPTCHA from "react-google-recaptcha";
import { 
  Mail, Lock, User, Phone, Globe,
  ArrowRight, Eye, EyeOff, Shield, CheckCircle
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

  // ✅ Get reCAPTCHA site key from Vite environment
  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  console.log('🔐 reCAPTCHA Site Key loaded:', RECAPTCHA_SITE_KEY ? '✅ Yes' : '❌ No');

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
    
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }
    
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (!/[A-Z]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (!/[0-9]/.test(formData.password)) {
      newErrors.password = 'Password must contain at least one number';
    }
    
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    
    if (!formData.fullName) {
      newErrors.fullName = 'Full name is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};
    
    if (userType === 'brand') {
      if (!formData.brandName) {
        newErrors.brandName = 'Brand name is required';
      }
      if (!formData.industry) {
        newErrors.industry = 'Industry is required';
      }
    } else {
      if (!formData.displayName) {
        newErrors.displayName = 'Display name is required';
      }
      if (!formData.handle) {
        newErrors.handle = 'Handle is required';
      }
      if (!formData.niche) {
        newErrors.niche = 'Please select a niche';
      }
    }

    if (!captchaToken) {
      newErrors.captcha = 'Please verify reCAPTCHA';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleEmailOTP = async () => {
    if (!formData.email) {
      toast.error('Email is required');
      return;
    }
    
    const result = await sendEmailOTP(formData.email);
    if (result.success) {
      setOtpDestination(formData.email);
      setOtpType('email');
      setShowOTP(true);
    }
  };

  const handlePhoneOTP = async () => {
    if (!formData.phone) {
      toast.error('Please enter phone number');
      return;
    }
    const result = await sendPhoneOTP(formData.phone);
    if (result.success) {
      setOtpDestination(formData.phone);
      setOtpType('phone');
      setShowOTP(true);
    }
  };

  const handleVerifyOTP = async (code) => {
    let result;
    if (otpType === 'email') {
      result = await verifyEmailOTP(otpDestination, code);
    } else {
      result = await verifyPhoneOTP(otpDestination, code);
    }

    if (result.success) {
      setShowOTP(false);
      setStep(3);
    }
  };

  const handleResendOTP = async () => {
    if (otpType === 'email') {
      await sendEmailOTP(otpDestination);
    } else {
      await sendPhoneOTP(otpDestination);
    }
  };

  const handleCaptchaChange = (token) => {
    console.log('🔐 reCAPTCHA token received:', token ? '✅ Yes' : '❌ No');
    setCaptchaToken(token);
    if (errors.captcha) {
      setErrors(prev => ({
        ...prev,
        captcha: null
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (step === 1) {
      if (validateStep1()) {
        setStep(2);
      }
    } else if (step === 2) {
      if (validateStep2()) {
        handleEmailOTP();
      }
    } else {
      setLoading(true);
      
      const signupData = {
        email: formData.email,
        password: formData.password,
        fullName: formData.fullName,
        userType: userType,
        phone: formData.phone || '',
        captchaToken: captchaToken,
      };

      if (userType === 'brand') {
        signupData.brandName = formData.brandName;
        signupData.industry = formData.industry;
        signupData.website = formData.website || '';
      } else {
        signupData.displayName = formData.displayName;
        const cleanHandle = formData.handle.startsWith('@') 
          ? formData.handle.substring(1) 
          : formData.handle;
        signupData.handle = cleanHandle;
        signupData.niches = formData.niche ? [formData.niche] : [];
      }

      console.log('Submitting signup data:', signupData);

      try {
        const result = await signup(signupData);
        
        if (result.success) {
          toast.success('Account created successfully!');
          if (userType === 'brand') {
            navigate('/brand/dashboard');
          } else {
            navigate('/creator/dashboard');
          }
        }
      } catch (error) {
        console.error('Signup error:', error);
        
        if (captchaRef.current) {
          captchaRef.current.reset();
          setCaptchaToken(null);
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const handleChange = (e) => {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full bg-white p-8 rounded-xl shadow-lg">
        
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">Create Account</h2>
          <p className="mt-2 text-sm text-gray-600">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-500">
              Sign in
            </Link>
          </p>
        </div>

        {step === 1 && (
          <div className="mb-8">
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setUserType('brand')}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  userType === 'brand'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <h3 className="font-semibold text-lg mb-1">Brand</h3>
                <p className="text-sm text-gray-600">Find creators for your campaigns</p>
              </button>
              <button
                type="button"
                onClick={() => setUserType('creator')}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  userType === 'creator'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <h3 className="font-semibold text-lg mb-1">Creator</h3>
                <p className="text-sm text-gray-600">Monetize your audience</p>
              </button>
            </div>
          </div>
        )}

        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className={`flex-1 h-2 rounded-l-full ${step >= 1 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 ${step >= 2 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-2 rounded-r-full ${step >= 3 ? 'bg-indigo-600' : 'bg-gray-200'}`} />
          </div>
          <div className="flex justify-between mt-2 text-sm text-gray-600">
            <span>Basic Info</span>
            <span>Details</span>
            <span>Verification</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {step === 1 ? (
            <div className="space-y-4">
              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    name="fullName"
                    required
                    className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.fullName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your full name"
                    value={formData.fullName}
                    onChange={handleChange}
                  />
                </div>
                {errors.fullName && <p className="mt-1 text-sm text-red-600">{errors.fullName}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    name="email"
                    required
                    className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleChange}
                  />
                </div>
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="tel"
                    name="phone"
                    className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Enter your phone number"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    required
                    className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Create a password"
                    value={formData.password}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    required
                    className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirm your password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-5 h-5 text-gray-400" />
                    ) : (
                      <Eye className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                </div>
                {errors.confirmPassword && <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>}
              </div>
            </div>
          ) : step === 2 ? (
            <div className="space-y-4">
              {userType === 'brand' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Brand Name *
                    </label>
                    <input
                      type="text"
                      name="brandName"
                      required
                      className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.brandName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your brand name"
                      value={formData.brandName}
                      onChange={handleChange}
                    />
                    {errors.brandName && <p className="mt-1 text-sm text-red-600">{errors.brandName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Industry *
                    </label>
                    <select
                      name="industry"
                      required
                      className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.industry ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.industry}
                      onChange={handleChange}
                    >
                      <option value="">Select industry</option>
                      {brandIndustries.map(industry => (
                        <option key={industry.value} value={industry.value}>
                          {industry.label}
                        </option>
                      ))}
                    </select>
                    {errors.industry && <p className="mt-1 text-sm text-red-600">{errors.industry}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Website
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="url"
                        name="website"
                        className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                        placeholder="https://www.yourbrand.com"
                        value={formData.website}
                        onChange={handleChange}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Display Name *
                    </label>
                    <input
                      type="text"
                      name="displayName"
                      required
                      className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.displayName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="How should brands address you?"
                      value={formData.displayName}
                      onChange={handleChange}
                    />
                    {errors.displayName && <p className="mt-1 text-sm text-red-600">{errors.displayName}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Handle *
                    </label>
                    <input
                      type="text"
                      name="handle"
                      required
                      className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.handle ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="username (without @)"
                      value={formData.handle}
                      onChange={handleChange}
                    />
                    {errors.handle && <p className="mt-1 text-sm text-red-600">{errors.handle}</p>}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Primary Niche *
                    </label>
                    <select
                      name="niche"
                      required
                      className={`w-full px-3 py-3 border rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 ${
                        errors.niche ? 'border-red-500' : 'border-gray-300'
                      }`}
                      value={formData.niche}
                      onChange={handleChange}
                    >
                      <option value="">Select your niche</option>
                      {creatorNiches.map(niche => (
                        <option key={niche.value} value={niche.value}>
                          {niche.label}
                        </option>
                      ))}
                    </select>
                    {errors.niche && <p className="mt-1 text-sm text-red-600">{errors.niche}</p>}
                  </div>
                </>
              )}

              {/* ✅ reCAPTCHA - with null check */}
              {RECAPTCHA_SITE_KEY ? (
                <div className={errors.captcha ? 'border border-red-500 p-3 rounded-lg bg-red-50' : 'p-3 border border-gray-200 rounded-lg'}>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Verify reCAPTCHA *
                  </label>
                  <ReCAPTCHA
                    ref={captchaRef}
                    sitekey={RECAPTCHA_SITE_KEY}
                    onChange={handleCaptchaChange}
                  />
                  {errors.captcha && <p className="mt-2 text-sm text-red-600">{errors.captcha}</p>}
                </div>
              ) : (
                <div className="p-3 border border-yellow-200 rounded-lg bg-yellow-50">
                  <p className="text-sm text-yellow-800">
                    ⚠️ reCAPTCHA is not configured. Please set VITE_RECAPTCHA_SITE_KEY in .env
                  </p>
                </div>
              )}

              <div className="flex items-center mt-4">
                <input
                  id="terms"
                  name="terms"
                  type="checkbox"
                  required
                  className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                />
                <label htmlFor="terms" className="ml-2 block text-sm text-gray-900">
                  I agree to the{' '}
                  <Link to="/terms" className="text-indigo-600 hover:text-indigo-500">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link to="/privacy" className="text-indigo-600 hover:text-indigo-500">
                    Privacy Policy
                  </Link>
                </label>
              </div>
            </div>
          ) : (
            <div className="text-center space-y-6">
              <div className="flex justify-center">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                </div>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900">
                Almost there!
              </h3>
              
              <p className="text-gray-600">
                We've sent a verification code to your email. Please check your inbox and verify your email address.
              </p>

              {formData.phone && (
                <button
                  type="button"
                  onClick={handlePhoneOTP}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium"
                >
                  Also verify phone number (optional)
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || authLoading || (step === 2 && !captchaToken)}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading || authLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                {step === 1 ? 'Continue' : step === 2 ? 'Create Account' : 'Go to Dashboard'}
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
            <Shield className="w-3 h-3" />
            <span>Your information is secure and encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;