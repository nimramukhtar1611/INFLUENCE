import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ReCAPTCHA from "react-google-recaptcha";
import { Mail, Lock, ArrowRight, Eye, EyeOff, User, Shield } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, isAuthenticated, user, loading: authLoading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // ✅ Get reCAPTCHA site key from Vite environment
  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  console.log('🔐 reCAPTCHA Site Key loaded:', RECAPTCHA_SITE_KEY ? '✅ Yes' : '❌ No');
  
  // Smart CAPTCHA tracking
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captchaToken, setCaptchaToken] = useState(null);
  const captchaRef = React.useRef();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    userType: 'brand'
  });

  const [errors, setErrors] = useState({});

  // Redirect after login
  useEffect(() => {
    if (!loading && isAuthenticated && user) {
      console.log('Already logged in, redirecting to dashboard');
      if (user.userType === 'brand') {
        navigate('/brand/dashboard', { replace: true });
      } else if (user.userType === 'creator') {
        navigate('/creator/dashboard', { replace: true });
      } else if (user.userType === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      }
    }
  }, [isAuthenticated, user, loading, navigate]);

  // Validation
  const validate = () => {
    const newErrors = {};

    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email))
      newErrors.email = 'Invalid email';

    if (!formData.password) newErrors.password = 'Password is required';

    if (!formData.userType) newErrors.userType = 'Select account type';

    // Only validate CAPTCHA if it's showing
    if (showCaptcha && !captchaToken) {
      newErrors.captcha = 'Please verify reCAPTCHA';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle CAPTCHA change
  const handleCaptchaChange = (token) => {
    console.log('🔐 reCAPTCHA token received:', token ? '✅ Yes' : '❌ No');
    setCaptchaToken(token);
    if (errors.captcha) {
      setErrors({ ...errors, captcha: null });
    }
  };

  // Submit
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validate()) return;

    setLoading(true);

    try {
      console.log('🔑 Login attempt:', {
        email: formData.email,
        userType: formData.userType,
        loginAttempts,
        showCaptcha,
        hasCaptcha: !!captchaToken
      });

      const payload = {
        email: formData.email,
        password: formData.password,
        userType: formData.userType
      };

      if (showCaptcha && captchaToken) {
        payload.captchaToken = captchaToken;
      }

      const result = await login(
        payload.email,
        payload.password,
        payload.userType,
        payload.captchaToken || null
      );

      // Check for 2FA requirement FIRST
      if (result?.require2FA) {
        console.log('⚠️ 2FA required');
        toast('2FA required - please verify your code');
        navigate('/2fa-verify', { state: { userId: result.userId } });
      } else if (result?.success) {
        console.log('✅ Login successful');
        toast.success('Login successful!');
        setLoginAttempts(0);
        setShowCaptcha(false);
        setCaptchaToken(null);
      } else {
        const newAttempts = loginAttempts + 1;
        console.log(`❌ Login failed. Attempts: ${newAttempts}`);
        setLoginAttempts(newAttempts);

        if (newAttempts >= 2) {
          console.log('⚠️ Showing CAPTCHA after 2+ failed attempts');
          setShowCaptcha(true);
          toast('Please complete reCAPTCHA to continue');
        }

        if (captchaRef.current) {
          captchaRef.current.reset();
          setCaptchaToken(null);
        }
      }
    } catch (error) {
      console.error('Login error:', error);
      
      const newAttempts = loginAttempts + 1;
      console.log(`❌ Login error. Attempts: ${newAttempts}`);
      setLoginAttempts(newAttempts);

      if (newAttempts >= 2) {
        console.log('⚠️ Showing CAPTCHA after 2+ attempts');
        setShowCaptcha(true);
        toast.warning('Please complete reCAPTCHA to continue');
      }

      toast.error(error.message || 'Login failed');

      if (captchaRef.current) {
        captchaRef.current.reset();
        setCaptchaToken(null);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg">

        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center">
              <Shield className="text-white w-8 h-8" />
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-900">
            Welcome Back
          </h2>

          <p className="text-gray-600 mt-2">
            Sign in to your InfluenceX account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          {/* User Type */}
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2 tracking-wide uppercase">
              Sign in as a
            </label>

            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, userType: 'brand' })
                }
                className={`p-3 border-2 rounded-lg text-center transition-all ${
                  formData.userType === 'brand'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <User className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                <span className="text-sm font-medium">Brand</span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setFormData({ ...formData, userType: 'creator' })
                }
                className={`p-3 border-2 rounded-lg text-center transition-all ${
                  formData.userType === 'creator'
                    ? 'border-indigo-600 bg-indigo-50'
                    : 'border-gray-200 hover:border-indigo-300'
                }`}
              >
                <User className="w-5 h-5 mx-auto mb-1 text-indigo-600" />
                <span className="text-sm font-medium">Creator</span>
              </button>
            </div>

            {errors.userType && (
              <p className="mt-1 text-sm text-red-600">
                {errors.userType}
              </p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>

            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />

              <input
                type="email"
                className={`w-full pl-10 pr-3 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="your@email.com"
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  if (errors.email) setErrors({ ...errors, email: null });
                }}
              />
            </div>

            {errors.email && (
              <p className="mt-1 text-sm text-red-600">
                {errors.email}
              </p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>

            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />

              <input
                type={showPassword ? 'text' : 'password'}
                className={`w-full pl-10 pr-10 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.password ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="Enter password"
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  if (errors.password)
                    setErrors({ ...errors, password: null });
                }}
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>

            {errors.password && (
              <p className="mt-1 text-sm text-red-600">
                {errors.password}
              </p>
            )}
          </div>

          {/* Forgot */}
          <div className="text-right">
            <Link
              to="/forgot-password"
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              Forgot password?
            </Link>
          </div>

          {/* ✅ SMART CAPTCHA - Only shown after 2+ failed attempts */}
          {showCaptcha && RECAPTCHA_SITE_KEY && (
            <div className={errors.captcha ? 'border border-red-500 p-3 rounded-lg bg-red-50' : 'p-3 border border-yellow-200 rounded-lg bg-yellow-50'}>
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-yellow-600" />
                <label className="block text-sm font-medium text-gray-700">
                  Verify reCAPTCHA *
                </label>
              </div>
              <ReCAPTCHA
                ref={captchaRef}
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={handleCaptchaChange}
              />
              {errors.captcha && <p className="mt-2 text-sm text-red-600">{errors.captcha}</p>}
              <p className="mt-2 text-xs text-gray-600">
                We detected multiple login attempts. Please verify you're not a robot.
              </p>
            </div>
          )}

          {/* Debug counter */}
          {import.meta.env.MODE === 'development' && loginAttempts > 0 && (
            <div className="p-2 bg-gray-100 rounded text-xs text-gray-600 text-center">
              🔍 Login attempts: {loginAttempts}
            </div>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading || authLoading || (showCaptcha && !captchaToken)}
            className="w-full flex justify-center items-center py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-all"
          >
            {loading || authLoading ? (
              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                Sign In
                <ArrowRight className="ml-2 w-5 h-5" />
              </>
            )}
          </button>

          <p className="text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign up
            </Link>
          </p>

          <div className="mt-4 text-center">
            <Link
              to="/admin/login"
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Admin Login →
            </Link>
          </div>

          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-gray-400">
              <Shield className="w-3 h-3" />
              <span>Your information is secure and encrypted</span>
            </div>
          </div>

        </form>
      </div>
    </div>
  );
};

export default Login;