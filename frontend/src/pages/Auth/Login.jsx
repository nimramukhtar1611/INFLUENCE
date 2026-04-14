import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import ReCAPTCHA from "react-google-recaptcha";
import { Mail, Lock, ArrowRight, Eye, EyeOff, User, Shield, Briefcase, Pen } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useTheme } from '../../hooks/useTheme';
import toast from 'react-hot-toast';

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { login, isAuthenticated, user, loading: authLoading } = useAuth();

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  console.log('🔐 reCAPTCHA Site Key loaded:', RECAPTCHA_SITE_KEY ? '✅ Yes' : '❌ No');

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

  const validate = () => {
    const newErrors = {};
    if (!formData.email) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = 'Invalid email';
    if (!formData.password) newErrors.password = 'Password is required';
    if (!formData.userType) newErrors.userType = 'Select account type';
    if (showCaptcha && !captchaToken) newErrors.captcha = 'Please verify reCAPTCHA';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleCaptchaChange = (token) => {
    console.log('🔐 reCAPTCHA token received:', token ? '✅ Yes' : '❌ No');
    setCaptchaToken(token);
    if (errors.captcha) setErrors({ ...errors, captcha: null });
  };

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

      if (showCaptcha && captchaToken) payload.captchaToken = captchaToken;

      const result = await login(
        payload.email,
        payload.password,
        payload.userType,
        payload.captchaToken || null
      );

      if (result?.require2FA) {
        console.log('⚠️ 2FA required');
        toast('2FA required - please verify your code');
        navigate('/2fa-verify', { state: { userId: result.userId } });
      } else if (result?.success) {
        console.log('✅ Login successful');
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
    <div
      className="min-h-screen flex items-center justify-center"
      style={{
        background: '#000000',
      }}
    >
      <div className="w-full p-4 sm:p-6 md:p-8" style={{ maxWidth: 480 }}>

        {/* heading */}
        <div className="mb-8">
          <h2
            style={{
              fontSize: 'clamp(24px, 5vw, 28px)', fontWeight: 800, letterSpacing: '-0.5px',
              color: '#ffffff', marginBottom: 8,
            }}
          >
            Sign in to your account
          </h2>
          <p style={{ color: '#cccccc', fontSize: 'clamp(14px, 3vw, 15px)', lineHeight: 1.5 }}>
            Welcome back! Please enter your details.
          </p>
        </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

            {/* ── Account type selector ── */}
            <div>
              <label
                style={{
                  display: 'block', fontSize: 12, fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: '#ffffff', marginBottom: 12,
                }}
              >
                Sign in as
              </label>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Brand */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, userType: 'brand' })}
                  style={{
                    padding: '16px 12px',
                    borderRadius: 12,
                    border: formData.userType === 'brand'
                      ? '2px solid #ffffff'
                      : '2px solid #333333',
                    background: formData.userType === 'brand'
                      ? '#1a1a1a'
                      : '#000000',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 30, height: 30, borderRadius: 10,
                      background: formData.userType === 'brand'
                        ? '#ffffff'
                        : '#333333',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <Briefcase
                      size={14}
                      style={{ color: formData.userType === 'brand' ? '#000000' : '#ffffff' }}
                    />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p
                      style={{
                        fontSize: 13, fontWeight: 600,
                        color: formData.userType === 'brand'
                          ? '#ffffff'
                          : '#ffffff',
                      }}
                    >
                      Brand
                    </p>
                    <p style={{ fontSize: 11, color: '#cccccc', marginTop: 2 }}>
                      Run campaigns
                    </p>
                  </div>
                </button>

                {/* Creator */}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, userType: 'creator' })}
                  style={{
                    padding: '16px 12px',
                    borderRadius: 12,
                    border: formData.userType === 'creator'
                      ? '2px solid #ffffff'
                      : '2px solid #333333',
                    background: formData.userType === 'creator'
                      ? '#1a1a1a'
                      : '#000000',
                    cursor: 'pointer',
                    transition: 'all 0.18s ease',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: 8,
                  }}
                >
                  <div
                    style={{
                      width: 30, height: 30, borderRadius: 10,
                      background: formData.userType === 'creator'
                        ? '#ffffff'
                        : '#333333',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 0.18s ease',
                    }}
                  >
                    <Pen
                      size={16}
                      style={{ color: formData.userType === 'creator' ? '#000000' : '#ffffff' }}
                    />
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <p
                      style={{
                        fontSize: 13, fontWeight: 600,
                        color: formData.userType === 'creator'
                          ? '#ffffff'
                          : '#ffffff',
                      }}
                    >
                      Creator
                    </p>
                    <p style={{ fontSize: 11, color: '#cccccc', marginTop: 2 }}>
                      Grow & earn
                    </p>
                  </div>
                </button>
              </div>

              {errors.userType && (
                <p style={{ marginTop: 6, fontSize: 12, color: '#ff4444' }}>{errors.userType}</p>
              )}
            </div>

            {/* ── Email ── */}
            <div>
              <label
                style={{
                  display: 'block', fontSize: 14, fontWeight: 600,
                  color: '#ffffff', marginBottom: 8,
                }}
              >
                Email
              </label>
              <div style={{ position: 'relative' }}>
                <Mail
                  size={16}
                  style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    color: errors.email ? '#ff4444' : '#cccccc',
                  }}
                />
                <input
                  type="email"
                  placeholder=""
                  value={formData.email}
                  onChange={(e) => {
                    setFormData({ ...formData, email: e.target.value });
                    if (errors.email) setErrors({ ...errors, email: null });
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 16px 14px 42px',
                    borderRadius: 10,
                    border: `1.5px solid ${errors.email ? '#ff4444' : '#333333'}`,
                    background: '#1a1a1a',
                    color: '#ffffff',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#666666'; e.target.style.background = '#1a1a1a'; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.email ? '#ff4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                />
              </div>
              {errors.email && (
                <p style={{ marginTop: 5, fontSize: 12, color: '#ff4444' }}>{errors.email}</p>
              )}
            </div>

            {/* ── Password ── */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label
                  style={{
                    fontSize: 14, fontWeight: 600,
                    color: '#ffffff',
                  }}
                >
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  style={{
                    fontSize: 12, fontWeight: 600,
                    color: '#ffffff', textDecoration: 'none',
                  }}
                >
                  Forgot password?
                </Link>
              </div>

              <div style={{ position: 'relative' }}>
                <Lock
                  size={16}
                  style={{
                    position: 'absolute', left: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    color: errors.password ? '#ff4444' : '#cccccc',
                  }}
                />
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={(e) => {
                    setFormData({ ...formData, password: e.target.value });
                    if (errors.password) setErrors({ ...errors, password: null });
                  }}
                  style={{
                    width: '100%',
                    padding: '14px 46px 14px 42px',
                    borderRadius: 10,
                    border: `1.5px solid ${errors.password ? '#ff4444' : '#333333'}`,
                    background: '#1a1a1a',
                    color: '#ffffff',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.15s',
                    boxSizing: 'border-box',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#666666'; e.target.style.background = '#1a1a1a'; }}
                  onBlur={(e) => { e.target.style.borderColor = errors.password ? '#ff4444' : '#333333'; e.target.style.background = '#1a1a1a'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    color: '#cccccc',
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {errors.password && (
                <p style={{ marginTop: 5, fontSize: 12, color: '#ff4444' }}>{errors.password}</p>
              )}
            </div>

            {/* ── Smart CAPTCHA ── */}
            {showCaptcha && RECAPTCHA_SITE_KEY && (
              <div
                style={{
                  padding: '14px 16px',
                  borderRadius: 10,
                  border: `1.5px solid ${errors.captcha ? '#ff4444' : '#666666'}`,
                  background: '#1a1a1a',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <Shield size={15} style={{ color: '#ffffff' }} />
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#ffffff' }}>
                    Security verification required
                  </span>
                </div>
                <ReCAPTCHA ref={captchaRef} sitekey={RECAPTCHA_SITE_KEY} onChange={handleCaptchaChange} />
                {errors.captcha && (
                  <p style={{ marginTop: 8, fontSize: 12, color: '#ff4444' }}>{errors.captcha}</p>
                )}
                <p style={{ marginTop: 8, fontSize: 11, color: '#cccccc' }}>
                  Multiple login attempts detected. Please verify you're not a robot.
                </p>
              </div>
            )}

            {/* ── Dev attempt counter ── */}
            {import.meta.env.MODE === 'development' && loginAttempts > 0 && (
              <div
                style={{
                  padding: '8px 12px', borderRadius: 8, textAlign: 'center',
                  fontSize: 11, background: '#1a1a1a',
                  color: '#cccccc',
                }}
              >
                🔍 Login attempts: {loginAttempts}
              </div>
            )}

            {/* ── Submit ── */}
            <button
              type="submit"
              disabled={loading || authLoading || (showCaptcha && !captchaToken)}
              style={{
                width: '100%',
                padding: '14px 20px',
                borderRadius: 10,
                border: '1px solid #333333',
                background: (loading || authLoading || (showCaptcha && !captchaToken))
                  ? '#1a1a1a'
                  : '#333333',
                color: '#ffffff',
                fontSize: 15,
                fontWeight: 700,
                cursor: (loading || authLoading || (showCaptcha && !captchaToken)) ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity 0.2s, transform 0.1s',
                letterSpacing: '0.01em',
              }}
              onMouseEnter={(e) => { if (!loading && !authLoading) e.target.style.background = '#404040'; }}
              onMouseLeave={(e) => { e.target.style.background = '#333333'; }}
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
                  Continue
                  <ArrowRight size={15} />
                </>
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: 24 }}>
              <span style={{ fontSize: 13, color: '#cccccc' }}>
                Don't have an account?{' '}
              </span>
              <Link
                to="/signup"
                style={{
                  fontSize: 13, fontWeight: 600,
                  color: '#ffffff', textDecoration: 'none',
                }}
                onMouseEnter={(e) => { e.target.style.color = '#cccccc'; }}
                onMouseLeave={(e) => { e.target.style.color = '#ffffff'; }}
              >
                Sign up
              </Link>
            </div>

            <div style={{ textAlign: 'center' }}>
              <Link
                to="/admin/login"
                style={{
                  fontSize: 12, color: '#cccccc',
                  textDecoration: 'none', transition: 'color 0.15s',
                }}
                onMouseEnter={(e) => { e.target.style.color = '#ffffff'; }}
                onMouseLeave={(e) => { e.target.style.color = '#cccccc'; }}
              >
                Admin Login →
              </Link>
            </div>

            <div
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 6, paddingTop: 4,
              }}
            >
              <Shield size={11} style={{ color: '#cccccc' }} />
              <span style={{ fontSize: 11, color: '#cccccc' }}>
                Your information is secure and encrypted
              </span>
            </div>


          </form>
        </div>
      </div>
  );
};

export default Login;